import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfigurator } from "../core/configurator";
import {
  INTROSPECT_MESSAGES,
  type IntrospectCommandArgs,
  IntrospectCommandHandler,
} from "./introspect";

// Mock modules
vi.mock("../cli/console", () => ({
  cliConsole: {
    header: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    processing: vi.fn(),
    important: vi.fn((text: string) => text),
    setOptions: vi.fn(),
  },
}));

vi.mock("../cli/command", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    confirmAction: vi.fn(),
  };
});

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(),
}));

vi.mock("../lib/utils/file", () => ({
  fileExists: vi.fn(),
  createBackup: vi.fn(),
}));

import { confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";

describe("IntrospectCommandHandler - Selective Options", () => {
  let handler: IntrospectCommandHandler;
  let mockConfigurator: Partial<SaleorConfigurator>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new IntrospectCommandHandler();

    // Create mock configurator
    mockConfigurator = {
      introspect: vi.fn().mockResolvedValue(undefined),
      diffForIntrospect: vi.fn().mockResolvedValue({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
        formattedOutput: "No changes",
      }),
    };

    vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as SaleorConfigurator);
    vi.mocked(fileExists).mockReturnValue(true);
  });

  const createTestArgs = (
    overrides: Partial<IntrospectCommandArgs> = {}
  ): IntrospectCommandArgs => ({
    config: "config.yml",
    url: "https://test.saleor.cloud/graphql/",
    token: "test-token",
    quiet: false,
    dryRun: false,
    include: undefined,
    exclude: undefined,
    backup: true,
    format: "table",
    ci: false,
    verbose: false,
    ...overrides,
  });

  describe("Include options", () => {
    it("should pass includeSections to diffForIntrospect when --include is provided", async () => {
      // Arrange
      const args = createTestArgs({ include: "channels,shop" });
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 2,
          creates: 1,
          updates: 1,
          deletes: 0,
          results: [],
        },
        formattedOutput: "2 changes",
      });
      vi.mocked(confirmAction).mockResolvedValue(true);

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: ["channels", "shop"],
        excludeSections: [],
      });
    });

    it("should display include message when --include is provided", async () => {
      // Arrange
      const args = createTestArgs({ include: "channels,productTypes" });

      // Act
      await handler.execute(args);

      // Assert
      expect(cliConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/Including only.*channels.*productTypes/)
      );
    });

    it("should handle single section in --include", async () => {
      // Arrange
      const args = createTestArgs({ include: "shop" });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: ["shop"],
        excludeSections: [],
      });
    });

    it("should handle whitespace in --include", async () => {
      // Arrange
      const args = createTestArgs({ include: " channels , shop , productTypes " });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: ["channels", "shop", "productTypes"],
        excludeSections: [],
      });
    });
  });

  describe("Exclude options", () => {
    it("should pass excludeSections to diffForIntrospect when --exclude is provided", async () => {
      // Arrange
      const args = createTestArgs({ exclude: "products,categories" });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: [],
        excludeSections: ["products", "categories"],
      });
    });

    it("should display exclude message when --exclude is provided", async () => {
      // Arrange
      const args = createTestArgs({ exclude: "products,attributes" });

      // Act
      await handler.execute(args);

      // Assert
      expect(cliConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/Excluding.*products.*attributes/)
      );
    });
  });

  describe("Combined include and exclude", () => {
    it("should handle both --include and --exclude together", async () => {
      // Arrange
      const args = createTestArgs({ 
        include: "channels,shop,productTypes",
        exclude: "products"
      });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: ["channels", "shop", "productTypes"],
        excludeSections: ["products"],
      });
    });

    it("should display both include and exclude messages", async () => {
      // Arrange
      const args = createTestArgs({ 
        include: "channels,shop",
        exclude: "products,categories"
      });

      // Act
      await handler.execute(args);

      // Assert
      expect(cliConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/Including only.*channels.*shop/)
      );
      expect(cliConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/Excluding.*products.*categories/)
      );
    });
  });

  describe("Error handling", () => {
    it("should handle invalid section names in --include", async () => {
      // Arrange
      const args = createTestArgs({ include: "invalid,sections" });

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toMatch(/Invalid sections specified in --include/);
        expect(result.message).toMatch(/invalid, sections/);
      }
    });

    it("should handle invalid section names in --exclude", async () => {
      // Arrange
      const args = createTestArgs({ exclude: "invalid,sections" });

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toMatch(/Invalid sections specified in --exclude/);
        expect(result.message).toMatch(/invalid, sections/);
      }
    });

    it("should handle mixed valid and invalid sections", async () => {
      // Arrange
      const args = createTestArgs({ include: "channels,invalid,shop" });

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toMatch(/Invalid sections specified in --include/);
        expect(result.message).toMatch(/invalid/);
      }
    });
  });

  describe("Integration with different formats", () => {
    it("should work with JSON format", async () => {
      // Arrange
      const args = createTestArgs({ 
        include: "channels",
        format: "json"
      });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "json",
        quiet: true,
        includeSections: ["channels"],
        excludeSections: [],
      });
    });

    it("should work with YAML format", async () => {
      // Arrange
      const args = createTestArgs({ 
        exclude: "products",
        format: "yaml"
      });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table", // YAML gets converted to table for diff display
        quiet: true,
        includeSections: [],
        excludeSections: ["products"],
      });
    });
  });

  describe("Integration with dry run", () => {
    it("should apply selective options in dry run mode", async () => {
      // Arrange
      const args = createTestArgs({ 
        include: "channels,shop",
        dryRun: true
      });
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [],
        },
        formattedOutput: "1 change",
      });

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: ["channels", "shop"],
        excludeSections: [],
      });
      expect(cliConsole.info).toHaveBeenCalledWith(
        INTROSPECT_MESSAGES.DRY_RUN_CHANGES(1)
      );
    });
  });

  describe("No selective options", () => {
    it("should pass empty arrays when no selective options are provided", async () => {
      // Arrange
      const args = createTestArgs();

      // Act
      await handler.execute(args);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
        includeSections: [],
        excludeSections: [],
      });
    });

    it("should not display any selective option messages", async () => {
      // Arrange
      const args = createTestArgs();

      // Act
      await handler.execute(args);

      // Assert
      expect(cliConsole.info).not.toHaveBeenCalledWith(
        expect.stringMatching(/Including only/)
      );
      expect(cliConsole.info).not.toHaveBeenCalledWith(
        expect.stringMatching(/Excluding/)
      );
    });
  });
});