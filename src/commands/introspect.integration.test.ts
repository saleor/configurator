import { beforeEach, describe, expect, it, type MockedFunction, vi } from "vitest";
import type { IntrospectDiffResult, SaleorConfigurator } from "../core/configurator";
import type { DiffSummary } from "../core/diff/types";
import { type IntrospectCommandArgs, introspectHandler } from "./introspect";

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

// Properly typed mock configurator
interface MockConfigurator extends Partial<SaleorConfigurator> {
  diffForIntrospect: MockedFunction<SaleorConfigurator["diffForIntrospect"]>;
  introspect: MockedFunction<SaleorConfigurator["introspect"]>;
}

// Helper to create mock diff result with proper typing
const createMockDiffResult = (
  totalChanges: number,
  data: Partial<DiffSummary> = {}
): IntrospectDiffResult => ({
  summary: {
    totalChanges,
    creates: Math.floor(totalChanges / 3),
    updates: Math.floor(totalChanges / 3),
    deletes: totalChanges - Math.floor(totalChanges / 3) * 2,
    results: [],
    ...data,
  },
  formattedOutput: totalChanges > 0 ? "Diff output" : "No changes",
});

// Helper to create a mock configurator with type safety
const createMockConfigurator = (overrides: Partial<MockConfigurator> = {}): SaleorConfigurator =>
  ({
    diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(0)),
    introspect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as SaleorConfigurator;

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
    include: undefined,
    exclude: undefined,
    backup: true,
    format: "table",
    ci: false,
    verbose: false,
  };

  describe("First-time user scenarios", () => {
    it("should handle first-time user with no config file", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator();

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const { fileExists } = await import("../lib/utils/file");
      vi.mocked(fileExists).mockReturnValue(false);

      const { cliConsole } = await import("../cli/console");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(0);
      expect(cliConsole.info).toHaveBeenCalledWith("🎉 Welcome! No local configuration found.");
      expect(cliConsole.info).toHaveBeenCalledWith(
        "📥 Fetching your Saleor configuration for the first time..."
      );
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(mockConfigurator.diffForIntrospect).not.toHaveBeenCalled();
    });

    it("should handle first-time user with introspection error", async () => {
      // Arrange
      const error = new Error("Network timeout");
      const mockConfigurator = createMockConfigurator({
        introspect: vi.fn().mockRejectedValue(error),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const { fileExists } = await import("../lib/utils/file");
      vi.mocked(fileExists).mockReturnValue(false);

      const { cliConsole } = await import("../cli/console");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(cliConsole.error).toHaveBeenCalledWith(expect.stringContaining("Network timeout"));
    });
  });

  describe("Basic functionality", () => {
    it("should handle successful introspection", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValue(true);

      const { fileExists, createBackup } = await import("../lib/utils/file");
      vi.mocked(fileExists).mockReturnValue(true); // Existing user
      vi.mocked(createBackup).mockResolvedValue("backup-path");

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(confirmAction).toHaveBeenCalled();
      expect(mockConfigurator.introspect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle dry-run mode with changes", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithDryRun = { ...mockArgs, dryRun: true };

      // Act
      await introspectHandler(argsWithDryRun);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle dry-run mode with no changes", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator();

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithDryRun = { ...mockArgs, dryRun: true };

      // Act
      await introspectHandler(argsWithDryRun);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle no changes scenario", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator();

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

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
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithCi = { ...mockArgs, ci: true };

      // Act
      await introspectHandler(argsWithCi);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle CI mode with no changes", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator();

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

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
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockRejectedValue(new Error(errorMessage)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      // Act
      await introspectHandler(mockArgs);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle user cancellation", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

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
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithJson = { ...mockArgs, format: "json" as const, dryRun: true };

      // Act
      await introspectHandler(argsWithJson);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle YAML format", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator({
        diffForIntrospect: vi.fn().mockResolvedValue(createMockDiffResult(2)),
      });

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithYaml = { ...mockArgs, format: "yaml" as const, dryRun: true };

      // Act
      await introspectHandler(argsWithYaml);

      // Assert
      expect(mockConfigurator.diffForIntrospect).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("Selective options", () => {
    it("should handle invalid --include option", async () => {
      // Arrange
      const argsWithInvalidInclude = { ...mockArgs, include: "invalid,sections" };

      // Act
      await introspectHandler(argsWithInvalidInclude);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle valid --include option", async () => {
      // Arrange
      const mockConfigurator = createMockConfigurator();

      const { createConfigurator } = await import("../core/configurator");
      vi.mocked(createConfigurator).mockReturnValue(mockConfigurator);

      const argsWithValidInclude = { ...mockArgs, include: "channels,shop" };

      // Act
      await introspectHandler(argsWithValidInclude);

      // Assert
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
