import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiffCommandArgs } from "./diff";
import { diffCommandConfig, diffCommandSchema, handleDiff } from "./diff";

// Mock the console and dependencies
const mockConsole = {
  setOptions: vi.fn(),
  header: vi.fn(),
  muted: vi.fn(),
  status: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const mockDiffSummary = {
  totalChanges: 2,
  creates: 1,
  updates: 1,
  deletes: 0,
  results: [],
};

const mockConfigurator = {
  diff: vi.fn().mockResolvedValue({
    summary: mockDiffSummary,
    output: "Mock diff output",
  }),
};

vi.mock("../cli/console", () => ({
  Console: vi.fn(() => mockConsole),
}));

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(() => mockConfigurator),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("diff command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to avoid actually exiting during tests
    vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  describe("diffCommandSchema", () => {
    it("should extend baseCommandArgsSchema", () => {
      const result = diffCommandSchema.safeParse({
        url: "https://example.com/graphql/",
        token: "test-token",
        quiet: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          url: "https://example.com/graphql/",
          token: "test-token",
          config: "config.yml",
          quiet: false,
          json: false,
          githubComment: false,
          failOnDelete: false,
          failOnBreaking: false,
          summary: false,
        });
      }
    });

    it("should handle optional fields", () => {
      const result = diffCommandSchema.safeParse({
        url: "https://example.com/graphql/",
        token: "test-token",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          url: "https://example.com/graphql/",
          token: "test-token",
          config: "config.yml",
          quiet: false,
          json: false,
          githubComment: false,
          failOnDelete: false,
          failOnBreaking: false,
          summary: false,
        });
      }
    });

    it("should validate required fields", () => {
      const result = diffCommandSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should accept CI/CD flags", () => {
      const result = diffCommandSchema.safeParse({
        url: "https://example.com/graphql/",
        token: "test-token",
        json: true,
        failOnDelete: true,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.json).toBe(true);
        expect(result.data.failOnDelete).toBe(true);
      }
    });
  });

  describe("handleDiff", () => {
    const mockArgs: DiffCommandArgs = {
      url: "https://example.com/graphql/",
      token: "test-token",
      config: "config.yml",
      quiet: false,
      json: false,
      githubComment: false,
      failOnDelete: false,
      failOnBreaking: false,
      summary: false,
    };

    it("should display header", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.header).toHaveBeenCalledWith("🔍 Saleor Configuration Diff\n");
    });

    it("should set console options based on quiet flag", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.setOptions).toHaveBeenCalledWith({ quiet: false });
    });

    it("should call configurator.diff()", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConfigurator.diff).toHaveBeenCalledOnce();
    });

    it("should display diff output", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.muted).toHaveBeenCalledWith(
        "⏳ Preparing a diff between the configuration and the Saleor instance..."
      );
      expect(mockConsole.status).toHaveBeenCalledWith("Mock diff output");
    });

    it("should display no changes message when no differences found", async () => {
      mockConfigurator.diff.mockResolvedValueOnce({
        summary: { ...mockDiffSummary, totalChanges: 0 },
        output: "No changes output",
      });

      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.status).toHaveBeenCalledWith(
        "\n✅ No differences found - configurations are in sync"
      );
    });

    it("should display changes count message when differences found", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.status).toHaveBeenCalledWith(
        "\n⚠️  Found 2 differences that would be applied by 'deploy'"
      );
    });

    it("should handle single difference correctly", async () => {
      mockConfigurator.diff.mockResolvedValueOnce({
        summary: { ...mockDiffSummary, totalChanges: 1 },
        output: "Single change output",
      });

      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.status).toHaveBeenCalledWith(
        "\n⚠️  Found 1 difference that would be applied by 'deploy'"
      );
    });

    it("should handle quiet mode", async () => {
      const quietArgs = { ...mockArgs, quiet: true };

      await expect(handleDiff(quietArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.setOptions).toHaveBeenCalledWith({ quiet: true });
    });

    it("should exit with code 0 on success", async () => {
      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it("should handle errors from configurator.diff()", async () => {
      const error = new Error("Diff failed");
      mockConfigurator.diff.mockRejectedValueOnce(error);

      await expect(handleDiff(mockArgs)).rejects.toThrow("Diff failed");

      expect(mockConfigurator.diff).toHaveBeenCalledOnce();
    });

    it("should log completion with summary statistics", async () => {
      const { logger } = await import("../lib/logger");

      await expect(handleDiff(mockArgs)).rejects.toThrow("process.exit");

      expect(logger.info).toHaveBeenCalledWith("Diff process completed successfully", {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
      });
    });
  });

  describe("diffCommandConfig", () => {
    it("should have correct configuration", () => {
      expect(diffCommandConfig.name).toBe("diff");
      expect(diffCommandConfig.description).toBe(
        "Shows the differences between local and remote Saleor configurations"
      );
      expect(diffCommandConfig.schema).toBe(diffCommandSchema);
      expect(diffCommandConfig.handler).toBe(handleDiff);
      expect(diffCommandConfig.requiresInteractive).toBe(true);
    });

    it("should have examples including CI/CD flags", () => {
      expect(diffCommandConfig.examples).toContain(
        "pnpm dlx @saleor/configurator diff --url https://my-shop.saleor.cloud/graphql/ --token token123"
      );
      expect(diffCommandConfig.examples).toContain("pnpm dlx @saleor/configurator diff --json");
      expect(diffCommandConfig.examples).toContain(
        "pnpm dlx @saleor/configurator diff --github-comment"
      );
      expect(diffCommandConfig.examples).toContain(
        "pnpm dlx @saleor/configurator diff --fail-on-delete"
      );
    });
  });

  describe("error handling", () => {
    const baseArgs: DiffCommandArgs = {
      url: "https://example.com/graphql/",
      token: "test-token",
      config: "config.yml",
      quiet: false,
      json: false,
      githubComment: false,
      failOnDelete: false,
      failOnBreaking: false,
      summary: false,
    };

    it("should handle configuration loading errors", async () => {
      const error = new Error("Configuration file not found");
      mockConfigurator.diff.mockRejectedValueOnce(error);

      await expect(handleDiff(baseArgs)).rejects.toThrow("Configuration file not found");
    });

    it("should handle network errors", async () => {
      const error = new Error("Network error");
      mockConfigurator.diff.mockRejectedValueOnce(error);

      await expect(handleDiff(baseArgs)).rejects.toThrow("Network error");
    });

    it("should handle authentication errors", async () => {
      const error = new Error("Unauthorized");
      mockConfigurator.diff.mockRejectedValueOnce(error);

      await expect(handleDiff({ ...baseArgs, token: "invalid-token" })).rejects.toThrow(
        "Unauthorized"
      );
    });
  });

  describe("integration scenarios", () => {
    const baseArgs: DiffCommandArgs = {
      url: "https://example.com/graphql/",
      token: "test-token",
      config: "config.yml",
      quiet: false,
      json: false,
      githubComment: false,
      failOnDelete: false,
      failOnBreaking: false,
      summary: false,
    };

    it("should handle large diff results", async () => {
      const largeDiffSummary = {
        totalChanges: 100,
        creates: 50,
        updates: 30,
        deletes: 20,
        results: Array(100)
          .fill(null)
          .map((_, i) => ({
            operation: i % 3 === 0 ? "CREATE" : i % 3 === 1 ? "UPDATE" : "DELETE",
            entityType: "Products",
            entityName: `Product ${i}`,
          })),
      };

      mockConfigurator.diff.mockResolvedValueOnce({
        summary: largeDiffSummary,
        output: "Large diff output",
      });

      await expect(handleDiff(baseArgs)).rejects.toThrow("process.exit");

      expect(mockConsole.status).toHaveBeenCalledWith(
        "\n⚠️  Found 100 differences that would be applied by 'deploy'"
      );
    });

    it("should handle diff with custom config path", async () => {
      await expect(handleDiff({ ...baseArgs, config: "custom-config.yml" })).rejects.toThrow(
        "process.exit"
      );

      expect(mockConfigurator.diff).toHaveBeenCalledOnce();
    });
  });
});
