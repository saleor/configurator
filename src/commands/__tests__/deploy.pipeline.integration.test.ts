import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { deployHandler } from "../deploy";
import type { DeployCommandArgs } from "../deploy";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ConfigFileBuilder } from "../../test-helpers/config-file-builder";
import { createTempDirectory } from "../../test-helpers/filesystem";
import type { TempDirectory } from "../../test-helpers/filesystem";

describe.skip("Deploy Command with Pipeline Integration", () => {
  let tempDir: TempDirectory;
  let configPath: string;
  let args: DeployCommandArgs;

  beforeEach(async () => {
    tempDir = createTempDirectory();
    configPath = path.join(tempDir.path, "config.yml");

    args = {
      url: "http://localhost:4000/graphql/",
      token: "test-token",
      config: configPath,
      quiet: true,
      ci: true,
      skipDiff: false,
    };

    // Mock console methods to capture output
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    tempDir.cleanup();
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
          productAttributes: [{ name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }, { name: "Blue" }] }],
        })
        .withPageType({ name: "Test Page Type" })
        .withCategory({ name: "Test Category" })
        .toYaml();

      await fs.writeFile(configPath, config);

      // Mock fetch to return successful responses
      vi.spyOn(global, 'fetch').mockImplementation(async (url, options) => {
        const fetchOptions = options as RequestInit;
        const body = JSON.parse(fetchOptions.body as string);
        
        // Mock responses based on operation
        if (body.operationName === "GetShopInfo") {
          return new Response(JSON.stringify({
            data: {
              shop: {
                name: "Old Shop",
                defaultMailSenderName: "Old Name",
              }
            }
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // Default empty response for other queries
        return new Response(JSON.stringify({
          data: {}
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      });

      await deployHandler(args);

      // Verify deploy executed without errors
      expect(console.log).toHaveBeenCalled();
    });

    it("skips stages with no changes", async () => {
      // Config with only shop settings
      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "Test Shop" })
        .toYaml();

      await fs.writeFile(configPath, config);

      // Mock fetch
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      // Should exit early with no changes
      await expect(deployHandler(args)).resolves.not.toThrow();
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("provides clear error message when stage fails", async () => {
      const config = new ConfigFileBuilder()
        .withProductType({
          name: "Test Product Type",
          productAttributes: [{ name: "Test Attr", inputType: "PLAIN_TEXT" }],
        })
        .toYaml();

      await fs.writeFile(configPath, config);

      // Mock fetch to return an error
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          errors: [{ message: "Invalid product type data" }]
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      await expect(deployHandler(args)).rejects.toThrow();
    });
  });

  describe("progress tracking", () => {
    it("updates progress for each stage", async () => {
      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "Updated Shop" })
        .withChannel({ name: "New Channel", slug: "new-channel", currencyCode: "EUR", defaultCountry: "DE" })
        .toYaml();

      await fs.writeFile(configPath, config);

      // Mock fetch
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      await deployHandler(args);

      // Should show progress updates
      expect(process.stdout.write).toHaveBeenCalled();
    });
  });

  describe("report generation", () => {
    it("generates deployment report with metrics", async () => {
      const reportPath = path.join(tempDir.path, "deploy-report.json");
      args.reportPath = reportPath;

      const config = new ConfigFileBuilder()
        .withShop({ defaultMailSenderName: "Report Test Shop" })
        .toYaml();

      await fs.writeFile(configPath, config);

      // Mock fetch
      vi.spyOn(global, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      );

      await deployHandler(args);

      // Verify report was created
      const reportExists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(reportExists).toBe(true);

      const report = JSON.parse(await fs.readFile(reportPath, "utf-8"));
      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("duration");
      expect(report).toHaveProperty("stages");
      expect(report).toHaveProperty("summary");
    });
  });
});