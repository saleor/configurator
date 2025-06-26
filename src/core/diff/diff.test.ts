import { describe, it, expect, beforeEach } from "vitest";
import { 
  DiffFormatter, 
  DetailedDiffFormatter, 
  SummaryDiffFormatter, 
  calculateDiffStatistics,
  filterDiffByEntityType,
  filterDiffByOperation,
  hasDiffChanges,
  hasSafeDiffChangesOnly,
  createDetailedFormatter,
  createSummaryFormatter,
  type DiffSummary,
  type DiffResult,
  type DiffStatistics,
} from "./index";

describe("DiffFormatter", () => {
  describe("format", () => {
    it("should format channel creation correctly", () => {
      // Arrange: Channel creation scenario
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "Germany",
            desired: {
              name: "Germany",
              currencyCode: "EUR",
              defaultCountry: "DE",
            },
          },
        ],
      };

      // Act
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("📊 Configuration Diff Results");
      expect(output).toContain("🌐 Channels");
      expect(output).toContain("➕ Create: \"Germany\"");
      expect(output).toContain("Currency: EUR");
      expect(output).toContain("Country: DE");
      expect(output).toContain("Total Changes: 1");
      expect(output).toContain("• 1 Creation");
      expect(output).toContain("• 0 Updates");
      expect(output).toContain("• 0 Deletions");
    });

    it("should format product type updates with attributes", () => {
      // Arrange: Product type update with attribute changes
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 1,
        deletes: 0,
        results: [
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "ProductTypeA",
            changes: [
              {
                field: "attributes",
                currentValue: [],
                desiredValue: ["Color"],
                description: 'Attribute "Color" added (in config, not on Saleor)',
              },
            ],
          },
        ],
      };

      // Act
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("📊 Configuration Diff Results");
      expect(output).toContain("📦 Product Types");
      expect(output).toContain("🔄 Update: \"ProductTypeA\"");
      expect(output).toContain('Attribute "Color" added (in config, not on Saleor)');
      expect(output).toContain("Total Changes: 1");
      expect(output).toContain("• 0 Creations");
      expect(output).toContain("• 1 Update");
      expect(output).toContain("• 0 Deletions");
    });

    it("should handle no changes scenario", () => {
      // Arrange: No changes scenario
      const summary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      // Act
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("✅ No differences found");
    });
  });

  describe("formatSummary", () => {
    it("should format brief summary correctly", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 5,
        creates: 2,
        updates: 2,
        deletes: 1,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
          { operation: "CREATE", entityType: "Channels", entityName: "Test2" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test3" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test4" },
          { operation: "DELETE", entityType: "Shop Settings", entityName: "Test5" },
        ],
      };

      // Act
      const output = DiffFormatter.formatSummary(summary);

      // Assert
      expect(output).toContain("📊 Found 5 differences");
      expect(output).toContain("➕ 2 items to create");
      expect(output).toContain("🔄 2 items to update");
      expect(output).toContain("➖ 1 item to delete");
      expect(output).toContain("By entity type:");
      expect(output).toContain("• Channels: 2 changes");
      expect(output).toContain("• Product Types: 2 changes");
      expect(output).toContain("• Shop Settings: 1 change");
    });

    it("should handle no changes in summary", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      // Act
      const output = DiffFormatter.formatSummary(summary);

      // Assert
      expect(output).toContain("✅ No differences found");
    });
  });
});

describe("DetailedDiffFormatter", () => {
  let formatter: DetailedDiffFormatter;

  beforeEach(() => {
    // Arrange
    formatter = new DetailedDiffFormatter();
  });

  it("should format detailed output correctly", () => {
    // Arrange
    const summary: DiffSummary = {
      totalChanges: 2,
      creates: 1,
      updates: 1,
      deletes: 0,
      results: [
        {
          operation: "CREATE",
          entityType: "Channels",
          entityName: "Germany",
          desired: { name: "Germany", currencyCode: "EUR" },
        },
        {
          operation: "UPDATE",
          entityType: "Product Types",
          entityName: "ProductA",
          changes: [
            {
              field: "name",
              currentValue: "OldName",
              desiredValue: "NewName",
            },
          ],
        },
      ],
    };

    // Act
    const output = formatter.format(summary);

    // Assert
    expect(output).toContain("📊 Configuration Diff Results");
    expect(output).toContain("🌐 Channels");
    expect(output).toContain("📦 Product Types");
    expect(output).toContain("➕ Create: \"Germany\"");
    expect(output).toContain("🔄 Update: \"ProductA\"");
  });

  it("should throw error for invalid summary", () => {
    // Arrange
    const invalidSummary = {
      totalChanges: -1,
      creates: 0,
      updates: 0,
      deletes: 0,
      results: [],
    } as DiffSummary;

    // Act & Assert
    expect(() => formatter.format(invalidSummary)).toThrow("Total changes cannot be negative");
  });
});

describe("SummaryDiffFormatter", () => {
  let formatter: SummaryDiffFormatter;

  beforeEach(() => {
    // Arrange
    formatter = new SummaryDiffFormatter();
  });

  it("should format summary output correctly", () => {
    // Arrange
    const summary: DiffSummary = {
      totalChanges: 3,
      creates: 1,
      updates: 1,
      deletes: 1,
      results: [
        { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
        { operation: "UPDATE", entityType: "Product Types", entityName: "Test2" },
        { operation: "DELETE", entityType: "Shop Settings", entityName: "Test3" },
      ],
    };

    // Act
    const output = formatter.format(summary);

    // Assert
    expect(output).toContain("📊 Found 3 differences");
    expect(output).toContain("➕ 1 item to create");
    expect(output).toContain("🔄 1 item to update");
    expect(output).toContain("➖ 1 item to delete");
  });
});

describe("Diff Operations", () => {
  describe("calculateDiffStatistics", () => {
    it("should calculate statistics correctly", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 4,
        creates: 2,
        updates: 1,
        deletes: 1,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
          { operation: "CREATE", entityType: "Channels", entityName: "Test2" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test3" },
          { operation: "DELETE", entityType: "Shop Settings", entityName: "Test4" },
        ],
      };

      // Act
      const stats: DiffStatistics = calculateDiffStatistics(summary);

      // Assert
      expect(stats.byEntityType.get("Channels")).toBe(2);
      expect(stats.byEntityType.get("Product Types")).toBe(1);
      expect(stats.byEntityType.get("Shop Settings")).toBe(1);
      expect(stats.byOperation.get("CREATE")).toBe(2);
      expect(stats.byOperation.get("UPDATE")).toBe(1);
      expect(stats.byOperation.get("DELETE")).toBe(1);
      expect(stats.mostCommonOperation).toBe("CREATE");
    });

    it("should handle empty summary", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      // Act
      const stats: DiffStatistics = calculateDiffStatistics(summary);

      // Assert
      expect(stats.byEntityType.size).toBe(0);
      expect(stats.mostCommonOperation).toBeNull();
    });
  });

  describe("filterDiffByEntityType", () => {
    it("should filter results by entity type", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 3,
        creates: 2,
        updates: 1,
        deletes: 0,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
          { operation: "CREATE", entityType: "Channels", entityName: "Test2" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test3" },
        ],
      };

      // Act
      const filtered = filterDiffByEntityType(summary, ["Channels"]);

      // Assert
      expect(filtered.totalChanges).toBe(2);
      expect(filtered.creates).toBe(2);
      expect(filtered.updates).toBe(0);
      expect(filtered.results).toHaveLength(2);
      expect(filtered.results.every(r => r.entityType === "Channels")).toBe(true);
    });
  });

  describe("filterDiffByOperation", () => {
    it("should filter results by operation type", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 3,
        creates: 2,
        updates: 1,
        deletes: 0,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
          { operation: "CREATE", entityType: "Product Types", entityName: "Test2" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test3" },
        ],
      };

      // Act
      const filtered = filterDiffByOperation(summary, ["CREATE"]);

      // Assert
      expect(filtered.totalChanges).toBe(2);
      expect(filtered.creates).toBe(2);
      expect(filtered.updates).toBe(0);
      expect(filtered.results).toHaveLength(2);
      expect(filtered.results.every(r => r.operation === "CREATE")).toBe(true);
    });
  });

  describe("hasDiffChanges", () => {
    it("should return true when there are changes", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [{ operation: "CREATE", entityType: "Channels", entityName: "Test" }],
      };

      // Act & Assert
      expect(hasDiffChanges(summary)).toBe(true);
    });

    it("should return false when there are no changes", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      // Act & Assert
      expect(hasDiffChanges(summary)).toBe(false);
    });
  });

  describe("hasSafeDiffChangesOnly", () => {
    it("should return true when there are no deletes", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 2,
        creates: 1,
        updates: 1,
        deletes: 0,
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test1" },
          { operation: "UPDATE", entityType: "Product Types", entityName: "Test2" },
        ],
      };

      // Act & Assert
      expect(hasSafeDiffChangesOnly(summary)).toBe(true);
    });

    it("should return false when there are deletes", () => {
      // Arrange
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 0,
        deletes: 1,
        results: [{ operation: "DELETE", entityType: "Channels", entityName: "Test" }],
      };

      // Act & Assert
      expect(hasSafeDiffChangesOnly(summary)).toBe(false);
    });
  });
});

describe("Factory Functions", () => {
  it("should create detailed formatter", () => {
    // Act
    const formatter = createDetailedFormatter();

    // Assert
    expect(formatter).toBeInstanceOf(DetailedDiffFormatter);
  });

  it("should create summary formatter", () => {
    // Act
    const formatter = createSummaryFormatter();

    // Assert
    expect(formatter).toBeInstanceOf(SummaryDiffFormatter);
  });
}); 