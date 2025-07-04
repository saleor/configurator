import { describe, it, expect, vi, beforeEach } from "vitest";
import { introspectCommandSchema, type IntrospectCommandArgs } from "./introspect";

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

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(),
}));

vi.mock("../lib/utils/file", () => ({
  fileExists: vi.fn(),
  createBackup: vi.fn(),
}));

describe("introspect command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("introspectCommandSchema", () => {
    // Test data
    const validArgs: IntrospectCommandArgs = {
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

    it("should validate valid arguments", () => {
      // Act
      const result = introspectCommandSchema.safeParse(validArgs);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(validArgs);
      }
    });

    it("should apply default values correctly", () => {
      // Arrange
      const minimalArgs = {
        config: "test.yml",
        url: "https://test.saleor.cloud/graphql/",
        token: "test-token",
      };

      // Act
      const result = introspectCommandSchema.safeParse(minimalArgs);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quiet).toBe(false);
        expect(result.data.dryRun).toBe(false);
        expect(result.data.noBackup).toBe(false);
        expect(result.data.format).toBe("table");
        expect(result.data.ci).toBe(false);
      }
    });

    it("should validate format enum values", () => {
      // Arrange
      const validFormats = ["table", "json", "yaml"];
      const invalidFormat = "invalid";

      // Act & Assert
      for (const format of validFormats) {
        const result = introspectCommandSchema.safeParse({
          ...validArgs,
          format,
        });
        expect(result.success).toBe(true);
      }

      const invalidResult = introspectCommandSchema.safeParse({
        ...validArgs,
        format: invalidFormat,
      });
      expect(invalidResult.success).toBe(false);
    });

    it("should handle selective options parsing", () => {
      // Arrange
      const argsWithOnly = { ...validArgs, only: "channels,shop" };
      const argsWithExclude = { ...validArgs, exclude: "products,categories" };

      // Act
      const onlyResult = introspectCommandSchema.safeParse(argsWithOnly);
      const excludeResult = introspectCommandSchema.safeParse(argsWithExclude);

      // Assert
      expect(onlyResult.success).toBe(true);
      expect(excludeResult.success).toBe(true);
      
      if (onlyResult.success) {
        expect(onlyResult.data.only).toBe("channels,shop");
      }
      if (excludeResult.success) {
        expect(excludeResult.data.exclude).toBe("products,categories");
      }
    });

    it("should handle CI mode flag correctly", () => {
      // Arrange
      const argsWithCi = { ...validArgs, ci: true };

      // Act
      const result = introspectCommandSchema.safeParse(argsWithCi);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ci).toBe(true);
      }
    });

    it("should handle boolean flags correctly", () => {
      // Arrange
      const argsWithFlags = {
        ...validArgs,
        dryRun: true,
        noBackup: true,
        quiet: true,
        ci: true,
      };

      // Act
      const result = introspectCommandSchema.safeParse(argsWithFlags);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dryRun).toBe(true);
        expect(result.data.noBackup).toBe(true);
        expect(result.data.quiet).toBe(true);
        expect(result.data.ci).toBe(true);
      }
    });
  });
}); 