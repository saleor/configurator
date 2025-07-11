import { beforeEach, describe, expect, it } from "vitest";
import {
  calculateDiffStatistics,
  createDetailedFormatter,
  createSummaryFormatter,
  DetailedDiffFormatter,
  DiffFormatter,
  type DiffStatistics,
  type DiffSummary,
  filterDiffByEntityType,
  filterDiffByOperation,
  hasDiffChanges,
  hasSafeDiffChangesOnly,
  IntrospectDiffFormatter,
  SummaryDiffFormatter,
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
      expect(output).toContain('➕ Create: "Germany"');
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
                description:
                  'Attribute "Color" added (in config, not on Saleor)',
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
      expect(output).toContain('🔄 Update: "ProductTypeA"');
      expect(output).toContain(
        'Attribute "Color" added (in config, not on Saleor)'
      );
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
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test3",
          },
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test4",
          },
          {
            operation: "DELETE",
            entityType: "Shop Settings",
            entityName: "Test5",
          },
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
    expect(output).toContain('➕ Create: "Germany"');
    expect(output).toContain('🔄 Update: "ProductA"');
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
    expect(() => formatter.format(invalidSummary)).toThrow(
      "Total changes cannot be negative"
    );
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
        {
          operation: "UPDATE",
          entityType: "Product Types",
          entityName: "Test2",
        },
        {
          operation: "DELETE",
          entityType: "Shop Settings",
          entityName: "Test3",
        },
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
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test3",
          },
          {
            operation: "DELETE",
            entityType: "Shop Settings",
            entityName: "Test4",
          },
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
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test3",
          },
        ],
      };

      // Act
      const filtered = filterDiffByEntityType(summary, ["Channels"]);

      // Assert
      expect(filtered.totalChanges).toBe(2);
      expect(filtered.creates).toBe(2);
      expect(filtered.updates).toBe(0);
      expect(filtered.results).toHaveLength(2);
      expect(filtered.results.every((r) => r.entityType === "Channels")).toBe(
        true
      );
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
          {
            operation: "CREATE",
            entityType: "Product Types",
            entityName: "Test2",
          },
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test3",
          },
        ],
      };

      // Act
      const filtered = filterDiffByOperation(summary, ["CREATE"]);

      // Assert
      expect(filtered.totalChanges).toBe(2);
      expect(filtered.creates).toBe(2);
      expect(filtered.updates).toBe(0);
      expect(filtered.results).toHaveLength(2);
      expect(filtered.results.every((r) => r.operation === "CREATE")).toBe(
        true
      );
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
        results: [
          { operation: "CREATE", entityType: "Channels", entityName: "Test" },
        ],
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
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "Test2",
          },
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
        results: [
          { operation: "DELETE", entityType: "Channels", entityName: "Test" },
        ],
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

describe("IntrospectDiffFormatter", () => {
  let formatter: IntrospectDiffFormatter;

  beforeEach(() => {
    formatter = new IntrospectDiffFormatter();
  });

  describe("format", () => {
    it("should format introspect diff with entities to add", () => {
      // Arrange: Remote has entities that will be added to local
      const summary: DiffSummary = {
        totalChanges: 2,
        creates: 2,
        updates: 0,
        deletes: 0,
        results: [
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "Default Channel",
            desired: {
              name: "Default Channel",
              currencyCode: "USD",
              defaultCountry: "US",
            },
          },
          {
            operation: "CREATE",
            entityType: "Shop Settings",
            entityName: "Shop Settings",
            desired: {
              defaultMailSenderName: "Saleor Store",
            },
          },
        ],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain("📊 Local Configuration Update Preview");
      expect(output).toContain(
        "The following changes will be made to your local configuration file"
      );
      expect(output).toContain('Will be added: "Default Channel"');
      expect(output).toContain('Will be added: "Shop Settings"');
      expect(output).toContain("Currency: USD");
      expect(output).toContain("Country: US");
      expect(output).toContain("2 new");
    });

    it("should format introspect diff with entities to remove", () => {
      // Arrange: Local has entities that will be removed
      const summary: DiffSummary = {
        totalChanges: 2,
        creates: 0,
        updates: 0,
        deletes: 2,
        results: [
          {
            operation: "DELETE",
            entityType: "Channels",
            entityName: "Old Channel",
            current: {
              name: "Old Channel",
              currencyCode: "EUR",
            },
          },
          {
            operation: "DELETE",
            entityType: "Product Types",
            entityName: "Deprecated Type",
            current: {
              name: "Deprecated Type",
            },
          },
        ],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain(
        'Will be removed: "Old Channel" (not present on Saleor)'
      );
      expect(output).toContain(
        'Will be removed: "Deprecated Type" (not present on Saleor)'
      );
      expect(output).toContain("2 removed");
    });

    it("should format introspect diff with updates", () => {
      // Arrange: Entities will be updated
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 1,
        deletes: 0,
        results: [
          {
            operation: "UPDATE",
            entityType: "Shop Settings",
            entityName: "Shop Settings",
            changes: [
              {
                field: "defaultMailSenderName",
                currentValue: "Remote Shop",
                desiredValue: "Local Shop",
                description: "Will be updated from local to remote value",
              },
              {
                field: "displayGrossPrices",
                currentValue: true,
                desiredValue: false,
              },
            ],
          },
        ],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain('Will be updated: "Shop Settings"');
      expect(output).toContain(
        'defaultMailSenderName: "Local Shop" → "Remote Shop"'
      );
      expect(output).toContain('displayGrossPrices: "false" → "true"');
      expect(output).toContain("1 modified");
    });

    it("should handle no changes scenario", () => {
      // Arrange: No changes
      const summary: DiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain(
        "✅ Local configuration is already up to date with Saleor!"
      );
    });

    it("should format product types with attributes", () => {
      // Arrange: Product type with attributes
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [
          {
            operation: "CREATE",
            entityType: "Product Types",
            entityName: "Book",
            desired: {
              name: "Book",
              attributes: [
                { name: "Author", inputType: "PLAIN_TEXT" },
                { name: "Genre", inputType: "DROPDOWN" },
              ],
            },
          },
        ],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain('Will be added: "Book"');
      expect(output).toContain("Attribute: Author");
      expect(output).toContain("Attribute: Genre");
    });

    it("should handle mixed operations", () => {
      // Arrange: Mix of creates, updates, and deletes
      const summary: DiffSummary = {
        totalChanges: 3,
        creates: 1,
        updates: 1,
        deletes: 1,
        results: [
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "New Channel",
            desired: { name: "New Channel" },
          },
          {
            operation: "UPDATE",
            entityType: "Shop Settings",
            entityName: "Shop Settings",
            changes: [
              { field: "name", currentValue: "Remote", desiredValue: "Local" },
            ],
          },
          {
            operation: "DELETE",
            entityType: "Product Types",
            entityName: "Old Type",
            current: { name: "Old Type" },
          },
        ],
      };

      // Act
      const output = formatter.format(summary);

      // Assert
      expect(output).toContain("Total changes: 3");
      expect(output).toContain("1 new");
      expect(output).toContain("1 modified");
      expect(output).toContain("1 removed");
    });
  });
});
