import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { DiffSummary } from "../core/diff";
import { DiffFormatter } from "../core/diff/formatter";

// Define a test schema matching the deploy command structure
const testDeploySchema = z.object({
  url: z.string(),
  token: z.string(),
  config: z.string().default("config.yml"),
  quiet: z.boolean().default(false),
  ci: z.boolean().default(false),
  force: z.boolean().default(false),
  skipDiff: z.boolean().default(false),
});

describe("Deploy Command Schema Validation", () => {
  it("should validate all required fields", () => {
    const validArgs = {
      url: "https://shop.saleor.cloud/graphql/",
      token: "test-token",
    };

    const result = testDeploySchema.safeParse(validArgs);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.config).toBe("config.yml");
      expect(result.data.quiet).toBe(false);
      expect(result.data.ci).toBe(false);
      expect(result.data.force).toBe(false);
      expect(result.data.skipDiff).toBe(false);
    }
  });

  it("should use custom flag values when provided", () => {
    const customArgs = {
      url: "https://shop.saleor.cloud/graphql/",
      token: "test-token",
      config: "custom.yml",
      quiet: true,
      ci: true,
      force: true,
      skipDiff: true,
    };

    const result = testDeploySchema.safeParse(customArgs);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data.config).toBe("custom.yml");
      expect(result.data.quiet).toBe(true);
      expect(result.data.ci).toBe(true);
      expect(result.data.force).toBe(true);
      expect(result.data.skipDiff).toBe(true);
    }
  });

  it("should require url and token", () => {
    const invalidArgs = { config: "test.yml" };
    const result = testDeploySchema.safeParse(invalidArgs);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors).toHaveLength(2);
      expect(result.error.errors.some(e => e.path.includes("url"))).toBe(true);
      expect(result.error.errors.some(e => e.path.includes("token"))).toBe(true);
    }
  });
});

describe("Diff Summary Analysis", () => {
  const createMockSummary = (
    creates: number,
    updates: number,
    deletes: number
  ): DiffSummary => ({
    totalChanges: creates + updates + deletes,
    creates,
    updates,
    deletes,
    results: [
      ...Array(creates).fill(0).map((_, i) => ({
        operation: "CREATE" as const,
        entityType: "Product Types" as const,
        entityName: `New Product Type ${i}`,
      })),
      ...Array(updates).fill(0).map((_, i) => ({
        operation: "UPDATE" as const,
        entityType: "Channels" as const,
        entityName: `Channel ${i}`,
      })),
      ...Array(deletes).fill(0).map((_, i) => ({
        operation: "DELETE" as const,
        entityType: "Categories" as const,
        entityName: `Old Category ${i}`,
      })),
    ],
  });

  it("should detect no changes scenario", () => {
    const summary = createMockSummary(0, 0, 0);
    
    expect(summary.totalChanges).toBe(0);
    expect(summary.creates).toBe(0);
    expect(summary.updates).toBe(0);
    expect(summary.deletes).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it("should detect safe changes without destructive operations", () => {
    const summary = createMockSummary(2, 3, 0);
    const hasDestructiveOperations = summary.deletes > 0;
    
    expect(summary.totalChanges).toBe(5);
    expect(summary.creates).toBe(2);
    expect(summary.updates).toBe(3);
    expect(summary.deletes).toBe(0);
    expect(hasDestructiveOperations).toBe(false);
  });

  it("should detect destructive operations", () => {
    const summary = createMockSummary(1, 2, 3);
    const hasDestructiveOperations = summary.deletes > 0;
    const deleteOperations = summary.results.filter(r => r.operation === "DELETE");
    
    expect(summary.totalChanges).toBe(6);
    expect(summary.deletes).toBe(3);
    expect(hasDestructiveOperations).toBe(true);
    expect(deleteOperations).toHaveLength(3);
    expect(deleteOperations[0].entityName).toBe("Old Category 0");
  });

  it("should categorize operations correctly", () => {
    const summary = createMockSummary(2, 1, 1);
    const createOps = summary.results.filter(r => r.operation === "CREATE");
    const updateOps = summary.results.filter(r => r.operation === "UPDATE");
    const deleteOps = summary.results.filter(r => r.operation === "DELETE");
    
    expect(createOps).toHaveLength(2);
    expect(updateOps).toHaveLength(1);
    expect(deleteOps).toHaveLength(1);
    
    expect(createOps[0].entityType).toBe("Product Types");
    expect(updateOps[0].entityType).toBe("Channels");
    expect(deleteOps[0].entityType).toBe("Categories");
  });
});

describe("Deployment Mode Logic", () => {
  type DeploymentMode = {
    ci: boolean;
    force: boolean;
    skipDiff: boolean;
  };

  const testModeLogic = (mode: DeploymentMode, hasDestructiveOps: boolean) => {
    const shouldSkipConfirmation = mode.force || mode.ci;
    const shouldShowDiff = !mode.skipDiff;
    const requiresExtraWarning = hasDestructiveOps && !shouldSkipConfirmation;
    
    return {
      shouldSkipConfirmation,
      shouldShowDiff,
      requiresExtraWarning,
    };
  };

  it("should handle normal interactive mode", () => {
    const mode = { ci: false, force: false, skipDiff: false };
    const result = testModeLogic(mode, false);
    
    expect(result.shouldSkipConfirmation).toBe(false);
    expect(result.shouldShowDiff).toBe(true);
    expect(result.requiresExtraWarning).toBe(false);
  });

  it("should handle CI mode", () => {
    const mode = { ci: true, force: false, skipDiff: false };
    const result = testModeLogic(mode, true);
    
    expect(result.shouldSkipConfirmation).toBe(true);
    expect(result.shouldShowDiff).toBe(true);
    expect(result.requiresExtraWarning).toBe(false);
  });

  it("should handle force mode", () => {
    const mode = { ci: false, force: true, skipDiff: false };
    const result = testModeLogic(mode, true);
    
    expect(result.shouldSkipConfirmation).toBe(true);
    expect(result.shouldShowDiff).toBe(true);
    expect(result.requiresExtraWarning).toBe(false);
  });

  it("should require extra warning for destructive operations in interactive mode", () => {
    const mode = { ci: false, force: false, skipDiff: false };
    const result = testModeLogic(mode, true);
    
    expect(result.shouldSkipConfirmation).toBe(false);
    expect(result.shouldShowDiff).toBe(true);
    expect(result.requiresExtraWarning).toBe(true);
  });

  it("should skip diff when requested", () => {
    const mode = { ci: false, force: false, skipDiff: true };
    const result = testModeLogic(mode, false);
    
    expect(result.shouldShowDiff).toBe(false);
  });
});

describe("Error Handling Categories", () => {
  const categorizeError = (errorMessage: string) => {
    if (errorMessage.includes("network") || errorMessage.includes("ENOTFOUND") || errorMessage.includes("timeout")) {
      return "Network";
    }
    if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("authentication")) {
      return "Authentication";
    }
    if (errorMessage.includes("GraphQL")) {
      return "GraphQL";
    }
    if (errorMessage.includes("validation") || errorMessage.includes("invalid") || errorMessage.includes("schema")) {
      return "Configuration";
    }
    return "Unknown";
  };

  const getSuggestion = (category: string) => {
    const suggestions = {
      "Network": "Check your internet connection and verify the URL is correct",
      "Authentication": "Verify your API token has the required permissions",
      "Configuration": "Review your configuration file for syntax errors",
      "GraphQL": "Check if the API schema matches your configuration",
      "Unknown": "Run with --verbose flag for more details",
    };
    return suggestions[category as keyof typeof suggestions] || suggestions.Unknown;
  };

  const errorTestCases = [
    { message: "network timeout occurred", expectedCategory: "Network" },
    { message: "ENOTFOUND hostname", expectedCategory: "Network" },
    { message: "401 Unauthorized", expectedCategory: "Authentication" },
    { message: "authentication failed", expectedCategory: "Authentication" },
    { message: "invalid configuration schema", expectedCategory: "Configuration" },
    { message: "validation error in config", expectedCategory: "Configuration" },
    { message: "GraphQL schema mismatch", expectedCategory: "GraphQL" },
    { message: "something completely unexpected", expectedCategory: "Unknown" },
  ];

  errorTestCases.forEach(({ message, expectedCategory }) => {
    it(`should categorize "${expectedCategory}" errors correctly`, () => {
      const category = categorizeError(message);
      const suggestion = getSuggestion(category);
      
      expect(category).toBe(expectedCategory);
      expect(suggestion).toBeTruthy();
      expect(typeof suggestion).toBe("string");
    });
  });

  it("should provide appropriate suggestions for each category", () => {
    expect(getSuggestion("Network")).toContain("connection");
    expect(getSuggestion("Authentication")).toContain("token");
    expect(getSuggestion("Configuration")).toContain("configuration");
    expect(getSuggestion("GraphQL")).toContain("schema");
    expect(getSuggestion("Unknown")).toContain("verbose");
  });
});

describe("Diff Formatting", () => {
  it("should format empty diff", () => {
    const summary: DiffSummary = {
      totalChanges: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
      results: [],
    };

    const output = DiffFormatter.format(summary);
    expect(output).toBeTruthy();
    expect(typeof output).toBe("string");
  });

  it("should format mixed operations", () => {
    const summary: DiffSummary = {
      totalChanges: 3,
      creates: 1,
      updates: 1,
      deletes: 1,
      results: [
        { operation: "CREATE", entityType: "Product Types", entityName: "Books" },
        { operation: "UPDATE", entityType: "Channels", entityName: "Default" },
        { operation: "DELETE", entityType: "Categories", entityName: "Old Category" },
      ],
    };

    const output = DiffFormatter.format(summary);
    expect(output).toBeTruthy();
    expect(typeof output).toBe("string");
  });
}); 