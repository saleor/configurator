import { describe, it, expect, vi, beforeEach } from "vitest";
import { introspectHandler, type IntrospectCommandArgs } from "./introspect";

// Mock modules before importing
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

vi.mock("../cli/command", () => ({
  baseCommandArgsSchema: {
    extend: vi.fn((schema) => schema),
  },
  confirmAction: vi.fn(),
}));

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(),
}));

vi.mock("../lib/utils/file", () => ({
  fileExists: vi.fn(),
  createBackup: vi.fn(),
}));

// Mock process.exit to prevent actual exit during tests
const mockExit = vi.fn();
vi.stubGlobal("process", {
  ...process,
  exit: mockExit,
});

describe("introspect integration tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockArgs: IntrospectCommandArgs = {
    config: "test-config.yml",
    url: "https://test.saleor.cloud/graphql/",
    token: "test-token",
    quiet: false,
    dryRun: false,
    only: undefined,
    exclude: undefined,
    noBackup: false,
    format: "table",
    ci: false,
  };

  describe("Basic functionality", () => {
    it("should handle successful introspection", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2 }),
        introspect: vi.fn().mockResolvedValue(undefined),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);
      
      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValue(true);
      
      const { fileExists, createBackup } = await import("../lib/utils/file");
      vi.mocked(fileExists).mockReturnValue(true);
      vi.mocked(createBackup).mockResolvedValue("backup-path");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalledWith({ format: "table", quiet: true });
      expect(confirmAction).toHaveBeenCalled();
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle dry-run mode with changes", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithDryRun = { ...mockArgs, dryRun: true };

      // Act
      await introspectHandler(argsWithDryRun);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle dry-run mode with no changes", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 0 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithDryRun = { ...mockArgs, dryRun: true };

      // Act
      await introspectHandler(argsWithDryRun);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle no changes scenario", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 0 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("CI mode", () => {
    it("should handle CI mode with changes detected", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithCi = { ...mockArgs, ci: true };

      // Act
      await introspectHandler(argsWithCi);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle CI mode with no changes", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 0 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithCi = { ...mockArgs, ci: true };

      // Act
      await introspectHandler(argsWithCi);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("Error handling", () => {
    it("should handle errors gracefully", async () => {
      // Arrange
      const errorMessage = "Test error";
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockRejectedValue(new Error(errorMessage)),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle user cancellation", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);
      
      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValue(false);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(confirmAction).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("Output formats", () => {
    it("should handle JSON format", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2, test: "data" }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithJson = { ...mockArgs, format: "json" as const, dryRun: true };

      // Act
      await introspectHandler(argsWithJson);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle YAML format", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 2, test: "data" }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithYaml = { ...mockArgs, format: "yaml" as const, dryRun: true };

      // Act
      await introspectHandler(argsWithYaml);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("Selective options", () => {
    it("should handle invalid --only option", async () => {
      // Arrange
      const argsWithInvalidOnly = { ...mockArgs, only: "invalid,sections" };

      // Act
      await introspectHandler(argsWithInvalidOnly);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle valid --only option", async () => {
      // Arrange
      const mockConfigurator = {
        diffForIntrospect: vi.fn().mockResolvedValue({ totalChanges: 0 }),
      };
      
      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as any);

      const argsWithValidOnly = { ...mockArgs, only: "channels,shop" };

      // Act
      await introspectHandler(argsWithValidOnly);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
}); 