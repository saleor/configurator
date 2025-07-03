import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runIntrospect } from "./introspect";
import * as factory from "../core/factory";
import * as cli from "../cli";

// Mock dependencies
vi.mock("../core/factory");
vi.mock("../cli", async () => {
  const actual = await vi.importActual("../cli");
  return {
    ...actual,
    parseCliArgs: vi.fn(),
    validateSaleorUrl: vi.fn(),
    setupLogger: vi.fn(),
    displayConfig: vi.fn(),
    handleCommandError: vi.fn(),
    confirmPrompt: vi.fn(),
    displayIntrospectDiffSummary: vi.fn(),
  };
});
vi.mock("../lib/utils/file");

describe("Introspect Command Integration Tests", () => {
  let mockConfigurator: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    // Mock configurator
    mockConfigurator = {
      introspect: vi.fn(),
      diffForIntrospect: vi.fn(),
    };

    vi.mocked(factory.createConfigurator).mockReturnValue(mockConfigurator);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("Empty Saleor Environment Scenario", () => {
    it("should handle introspect from empty remote to populated local", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: false,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);

      // Mock diff showing local will be cleared
      const diffSummary = {
        totalChanges: 8,
        creates: 0,
        updates: 0,
        deletes: 8,
        results: [
          { operation: "DELETE", entityType: "Shop Settings", entityName: "Shop Settings" },
          { operation: "DELETE", entityType: "Channels", entityName: "Poland" },
          { operation: "DELETE", entityType: "Product Types", entityName: "Book" },
          { operation: "DELETE", entityType: "Page Types", entityName: "Blog Post" },
          { operation: "DELETE", entityType: "Categories", entityName: "Fiction" },
          { operation: "DELETE", entityType: "Categories", entityName: "Non-Fiction" },
        ],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(cli.confirmPrompt).mockResolvedValue(true);
      
      // Mock empty config from remote
      mockConfigurator.introspect.mockResolvedValue({});

      // Mock file operations
      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");

      // Act
      await runIntrospect();

      // Assert
      // Verify correct diff perspective was shown
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
      });

      expect(cli.displayIntrospectDiffSummary).toHaveBeenCalledWith(diffSummary);

      // Verify warning message
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "⚠️  Introspecting will replace your local configuration file with the current state from Saleor."
      );

      // Verify introspect was called
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      
      // Verify process.exit was called with success
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("No Changes Scenario", () => {
    it("should exit early when local and remote are identical", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: false,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);

      const diffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);

      // Act
      await runIntrospect();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("✅ Local configuration is already up to date!");
      expect(mockConfigurator.introspect).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("Invalid Local Configuration", () => {
    it("should handle invalid local config with user confirmation", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: false,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);

      // Mock diff throwing validation error
      mockConfigurator.diffForIntrospect.mockRejectedValue(
        new Error("Invalid configuration file: Unknown field 'invalidField'")
      );

      vi.mocked(cli.confirmPrompt).mockResolvedValue(true);
      mockConfigurator.introspect.mockResolvedValue({ shop: {} });

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");

      // Act
      await runIntrospect();

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "⚠️  Local configuration file has validation issues:"
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "🔧 Introspecting will fetch the latest valid configuration from Saleor."
      );
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("Dry Run Mode", () => {
    it("should not make any changes in dry-run mode", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: false,
        dryRun: true,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(false);

      // Act
      await runIntrospect();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("🔍 Dry-run mode: No changes will be made\n");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "🔍 Dry-run complete. Use --force to skip confirmation or remove --dry-run to apply changes."
      );
      expect(mockConfigurator.introspect).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("Force Mode", () => {
    it("should skip confirmation with --force flag", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: true,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);
      mockConfigurator.introspect.mockResolvedValue({ shop: {} });

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");

      // Act
      await runIntrospect();

      // Assert
      // Should not call confirmPrompt
      expect(cli.confirmPrompt).not.toHaveBeenCalled();
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("User Cancellation", () => {
    it("should handle user cancelling the operation", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: false,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);

      const diffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 1,
        deletes: 0,
        results: [],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(cli.confirmPrompt).mockResolvedValue(false);

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);

      // Act
      await runIntrospect();

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith("❌ Operation cancelled by user");
      expect(mockConfigurator.introspect).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle introspect errors gracefully", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
        verbose: false,
        force: true,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);
      
      const error = new Error("Network error");
      mockConfigurator.introspect.mockRejectedValue(error);

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(false);

      // Act
      await runIntrospect();

      // Assert
      expect(cli.handleCommandError).toHaveBeenCalledWith(error);
    });
  });

  describe("Quiet Mode", () => {
    it("should suppress output in quiet mode", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: true,
        verbose: false,
        force: true,
        dryRun: false,
        skipValidation: false,
      };

      vi.mocked(cli.parseCliArgs).mockReturnValue(mockArgs);
      vi.mocked(cli.validateSaleorUrl).mockReturnValue(mockArgs.url);
      mockConfigurator.introspect.mockResolvedValue({});

      const fileUtils = await import("../lib/utils/file");
      vi.mocked(fileUtils.fileExists).mockReturnValue(false);

      // Act
      await runIntrospect();

      // Assert
      // Should not show most messages
      expect(cli.displayConfig).toHaveBeenCalledWith(expect.anything(), true);
      expect(consoleLogSpy).not.toHaveBeenCalledWith("⚙️  Initializing...");
      expect(consoleLogSpy).not.toHaveBeenCalledWith("🌐 Introspecting configuration from Saleor...");
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
}); 