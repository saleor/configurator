import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { introspectHandler } from "./introspect";
import * as configurator from "../core/configurator";
import * as fileUtils from "../lib/utils/file";
import * as commandUtils from "../cli/command";
import { cliConsole } from "../cli/console";

// Mock dependencies
vi.mock("../core/configurator");
vi.mock("../lib/utils/file");
vi.mock("../cli/command");
vi.mock("../cli/console");

describe("Introspect Command Integration Tests", () => {
  let mockConfigurator: any;
  let processExitSpy: any;

  beforeEach(() => {
    // Mock process.exit
    processExitSpy = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);

    // Mock configurator
    mockConfigurator = {
      introspect: vi.fn(),
      diffForIntrospect: vi.fn(),
    };

    vi.mocked(configurator.createConfigurator).mockReturnValue(mockConfigurator);

    // Mock CLI console
    vi.mocked(cliConsole.setOptions).mockImplementation(() => {});
    vi.mocked(cliConsole.header).mockImplementation(() => "");
    vi.mocked(cliConsole.info).mockImplementation(() => "");
    vi.mocked(cliConsole.warn).mockImplementation(() => "");
    vi.mocked(cliConsole.success).mockImplementation(() => "");
    vi.mocked(cliConsole.cancelled).mockImplementation(() => "");
    vi.mocked(cliConsole.processing).mockImplementation(() => "");
    vi.mocked(cliConsole.important).mockImplementation((text) => text);
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
      };

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
      vi.mocked(commandUtils.confirmAction).mockResolvedValue(true);
      
      // Mock empty config from remote
      mockConfigurator.introspect.mockResolvedValue({});

      // Mock file operations
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      // Verify correct diff perspective was shown
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({
        format: "table",
        quiet: true,
      });

      // Verify warning message
      expect(cliConsole.warn).toHaveBeenCalledWith(
        "⚠️  Introspecting will overwrite your local configuration file."
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
      };

      const diffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.success).toHaveBeenCalledWith("✅ Local configuration is already up to date!");
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
      };

      // Mock diff throwing validation error
      mockConfigurator.diffForIntrospect.mockRejectedValue(
        new Error("Invalid configuration file: Unknown field 'invalidField'")
      );

      vi.mocked(commandUtils.confirmAction).mockResolvedValue(true);
      mockConfigurator.introspect.mockResolvedValue({ shop: {} });
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.warn).toHaveBeenCalledWith("⚠️  Local configuration file has validation issues:");
      expect(cliConsole.warn).toHaveBeenCalledWith("🔧 Introspecting will fetch the latest valid configuration from Saleor.");
      expect(mockConfigurator.introspect).toHaveBeenCalled();
    });
  });

  describe("User Cancellation", () => {
    it("should handle user cancellation gracefully", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
      };

      const diffSummary = {
        totalChanges: 3,
        creates: 1,
        updates: 1,
        deletes: 1,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "New Channel" },
          { operation: "UPDATE", entityType: "Shop Settings", entityName: "Shop Settings" },
          { operation: "DELETE", entityType: "Product Types", entityName: "Old Type" },
        ],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(commandUtils.confirmAction).mockResolvedValue(false);
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.cancelled).toHaveBeenCalledWith("Operation cancelled by user");
      expect(mockConfigurator.introspect).not.toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe("New Configuration File", () => {
    it("should handle creating new configuration file", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
      };

      const diffSummary = {
        totalChanges: 3,
        creates: 3,
        updates: 0,
        deletes: 0,
        results: [
          { operation: "CREATE", entityType: "Shop Settings", entityName: "Shop Settings" },
          { operation: "CREATE", entityType: "Channels", entityName: "Default Channel" },
          { operation: "CREATE", entityType: "Product Types", entityName: "Default Type" },
        ],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(fileUtils.fileExists).mockReturnValue(false);
      mockConfigurator.introspect.mockResolvedValue({});

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.warn).toHaveBeenCalledWith(
        "📊 No local configuration found. A new configuration will be created."
      );
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(fileUtils.createBackup).not.toHaveBeenCalled();
    });
  });

  describe("Backup Creation", () => {
    it("should create backup before overwriting existing file", async () => {
      // Arrange
      const mockArgs = {
        url: "https://example.saleor.cloud/graphql/",
        token: "test-token",
        config: "config.yml",
        quiet: false,
      };

      const diffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 1,
        deletes: 0,
        results: [
          { operation: "UPDATE", entityType: "Shop Settings", entityName: "Shop Settings" },
        ],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(commandUtils.confirmAction).mockResolvedValue(true);
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);
      vi.mocked(fileUtils.createBackup).mockResolvedValue("config.yml.backup");
      mockConfigurator.introspect.mockResolvedValue({});

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.info).toHaveBeenCalledWith("💾 Creating backup of existing configuration...");
      expect(cliConsole.info).toHaveBeenCalledWith("   Backup saved to: config.yml.backup");
      expect(fileUtils.createBackup).toHaveBeenCalledWith("config.yml");
      expect(mockConfigurator.introspect).toHaveBeenCalled();
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
      };

      const diffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockConfigurator.diffForIntrospect.mockResolvedValue(diffSummary);
      vi.mocked(fileUtils.fileExists).mockReturnValue(true);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(cliConsole.setOptions).toHaveBeenCalledWith({ quiet: true });
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
}); 