import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { deployHandler } from "../deploy";
import type { DeployCommandArgs } from "../deploy";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { setupTestServer } from "../../test-helpers/graphql-mocks";
import { ConfigFileBuilder } from "../../test-helpers/config-file-builder";
import { createTempDir, cleanupTempDir } from "../../test-helpers/filesystem";

describe("Deploy Command with Pipeline Integration", () => {
  let server: ReturnType<typeof setupTestServer>;
  let tempDir: string;
  let configPath: string;
  let args: DeployCommandArgs;

  beforeEach(async () => {
    server = setupTestServer();
    tempDir = await createTempDir();
    configPath = path.join(tempDir, "config.yml");

    args = {
      url: "http://localhost:4000/graphql/",
      token: "test-token",
      config: configPath,
      quiet: true,
      ci: true,
      force: false,
      skipDiff: false,
    };

    // Mock console methods to capture output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    server.close();
    await cleanupTempDir(tempDir);
  });

  describe("successful deployment", () => {
    it("executes all stages for complete configuration", async () => {
      // Setup config with all entity types
      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .withChannel({
          name: "Test Channel",
          slug: "test-channel",
          currencyCode: "USD",
          defaultCountry: "US",
        })
        .withProductType({
          name: "Test Product Type",
          productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
        })
        .withPageType({ name: "Test Page Type" })
        .withCategory({ name: "Test Category" })
        .build();

      await fs.writeFile(configPath, config);

      // Mock server responses
      server.use(
        server.mockQuery("GetShopInfo", {
          shop: {
            name: "Old Shop",
            defaultMailSenderName: "Old Name",
          },
        }),
        server.mockQuery("GetChannels", {
          channels: [],
        }),
        server.mockQuery("GetProductTypes", {
          productTypes: { edges: [] },
        }),
        server.mockQuery("GetPageTypes", {
          pageTypes: { edges: [] },
        }),
        server.mockQuery("GetCategories", {
          categories: { edges: [] },
        }),
        server.mockMutation("ShopSettingsUpdate", {
          shopSettingsUpdate: {
            shop: { defaultMailSenderName: "Test Shop" },
          },
        }),
        server.mockMutation("ChannelCreate", {
          channelCreate: {
            channel: { id: "ch1", name: "Test Channel" },
          },
        })
      );

      await deployHandler(args);

      // Verify all mutations were called
      const requests = server.getRequests();
      expect(requests.some(r => r.operationName === "ShopSettingsUpdate")).toBe(true);
      expect(requests.some(r => r.operationName === "ChannelCreate")).toBe(true);
    });

    it("skips stages with no changes", async () => {
      // Config with only shop settings
      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .build();

      await fs.writeFile(configPath, config);

      // Mock server - shop already has the same settings
      server.use(
        server.mockQuery("GetShopInfo", {
          shop: {
            name: "Test Shop",
            defaultMailSenderName: "Test Shop",
          },
        }),
        server.mockQuery("GetChannels", { channels: [] }),
        server.mockQuery("GetProductTypes", { productTypes: { edges: [] } }),
        server.mockQuery("GetPageTypes", { pageTypes: { edges: [] } }),
        server.mockQuery("GetCategories", { categories: { edges: [] } })
      );

      // Should exit early with no changes
      await expect(deployHandler(args)).resolves.not.toThrow();

      const requests = server.getRequests();
      // Should only have queries, no mutations
      expect(requests.every(r => r.operationType === "query")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("provides clear error message when stage fails", async () => {
      const config = new ConfigFileBuilder()
        .withProductType({
          name: "Test Product Type",
          productAttributes: [{ name: "Test Attr", inputType: "PLAIN_TEXT" }],
        })
        .build();

      await fs.writeFile(configPath, config);

      server.use(
        server.mockQuery("GetShopInfo", { shop: { name: "Shop" } }),
        server.mockQuery("GetChannels", { channels: [] }),
        server.mockQuery("GetProductTypes", { productTypes: { edges: [] } }),
        server.mockQuery("GetPageTypes", { pageTypes: { edges: [] } }),
        server.mockQuery("GetCategories", { categories: { edges: [] } }),
        server.mockMutation("CreateProductType", {
          productTypeCreate: {
            errors: [{ message: "Invalid product type data" }],
          },
        })
      );

      args.ci = false; // To see error output

      await expect(deployHandler(args)).rejects.toThrow(/Managing product types/);
    });

    it("shows validation errors before network calls", async () => {
      // Invalid YAML
      await fs.writeFile(configPath, "invalid: yaml: content:");

      await expect(deployHandler(args)).rejects.toThrow();
      
      // Should not make any network calls
      expect(server.getRequests()).toHaveLength(0);
    });
  });

  describe("progress tracking", () => {
    it("completes stages with timing information", async () => {
      const config = new ConfigFileBuilder()
        .withChannel({
          name: "Fast Channel",
          slug: "fast",
          currencyCode: "USD",
          defaultCountry: "US",
        })
        .build();

      await fs.writeFile(configPath, config);

      server.use(
        server.mockQuery("GetShopInfo", { shop: { name: "Shop" } }),
        server.mockQuery("GetChannels", { channels: [] }),
        server.mockQuery("GetProductTypes", { productTypes: { edges: [] } }),
        server.mockQuery("GetPageTypes", { pageTypes: { edges: [] } }),
        server.mockQuery("GetCategories", { categories: { edges: [] } }),
        server.mockMutation("ChannelCreate", {
          channelCreate: {
            channel: { id: "ch1", name: "Fast Channel" },
          },
        })
      );

      // Capture console output
      const consoleOutput: string[] = [];
      vi.spyOn(console, "log").mockImplementation((msg) => {
        consoleOutput.push(msg);
      });

      args.quiet = false;
      await deployHandler(args);

      // Verify timing information is shown
      const summaryOutput = consoleOutput.join("\n");
      expect(summaryOutput).toMatch(/Duration: \d+(\.\d+)?[ms]/);
      expect(summaryOutput).toContain("Managing channels");
    });
  });

  describe("dry run mode", () => {
    it("validates without applying changes", async () => {
      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "New Name" })
        .build();

      await fs.writeFile(configPath, config);

      server.use(
        server.mockQuery("GetShopInfo", {
          shop: { defaultMailSenderName: "Old Name" },
        }),
        server.mockQuery("GetChannels", { channels: [] }),
        server.mockQuery("GetProductTypes", { productTypes: { edges: [] } }),
        server.mockQuery("GetPageTypes", { pageTypes: { edges: [] } }),
        server.mockQuery("GetCategories", { categories: { edges: [] } })
      );

      // Add dry-run flag when implemented
      // args.dryRun = true;
      // await deployHandler(args);

      // Should not call any mutations
      // const requests = server.getRequests();
      // expect(requests.every(r => r.operationType === "query")).toBe(true);
    });
  });
});