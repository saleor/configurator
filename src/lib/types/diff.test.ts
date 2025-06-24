import { describe, it, expect } from "vitest";
import { DiffFormatter, type DiffSummary } from "./diff";

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

    it("should format deletions correctly", () => {
      // Arrange: Deletion scenario
      const summary: DiffSummary = {
        totalChanges: 1,
        creates: 0,
        updates: 0,
        deletes: 1,
        results: [
          {
            operation: "DELETE",
            entityType: "Product Types",
            entityName: "ProductTypeC",
            current: { name: "ProductTypeC" },
          },
        ],
      };

      // Act  
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("📊 Configuration Diff Results");
      expect(output).toContain("📦 Product Types");
      expect(output).toContain("➖ Delete: \"ProductTypeC\"");
      expect(output).toContain("This product types exists on Saleor but not in local config");
      expect(output).toContain("Total Changes: 1");
      expect(output).toContain("• 0 Creations");
      expect(output).toContain("• 0 Updates");  
      expect(output).toContain("• 1 Deletion");
    });

    it("should handle multiple entity types", () => {
      // Arrange: Multiple different changes
      const summary: DiffSummary = {
        totalChanges: 3,
        creates: 1,
        updates: 1,
        deletes: 1,
        results: [
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "Germany",
          },
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "ProductA",
            changes: [
              {
                field: "name",
                currentValue: "ProductB",
                desiredValue: "ProductA",
              },
            ],
          },
          {
            operation: "DELETE",
            entityType: "Shop Settings",
            entityName: "Shop Settings",
          },
        ],
      };

      // Act
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("📊 Configuration Diff Results");
      expect(output).toContain("🌐 Channels");
      expect(output).toContain("📦 Product Types");
      expect(output).toContain("🏪 Shop Settings");
      expect(output).toContain("Total Changes: 3");
      expect(output).toContain("• 1 Creation");
      expect(output).toContain("• 1 Update");
      expect(output).toContain("• 1 Deletion");
    });

    it("should handle plural forms correctly", () => {
      // Arrange: Multiple changes of same types
      const summary: DiffSummary = {
        totalChanges: 4,
        creates: 2,
        updates: 2,
        deletes: 0,
        results: [
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "Germany",
          },
          {
            operation: "CREATE",
            entityType: "Channels",
            entityName: "France",
          },
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "ProductA",
            changes: [{ field: "test", currentValue: "old", desiredValue: "new" }],
          },
          {
            operation: "UPDATE",
            entityType: "Product Types",
            entityName: "ProductB",
            changes: [{ field: "test", currentValue: "old", desiredValue: "new" }],
          },
        ],
      };

      // Act
      const output = DiffFormatter.format(summary);

      // Assert
      expect(output).toContain("Total Changes: 4");
      expect(output).toContain("• 2 Creations");
      expect(output).toContain("• 2 Updates");
      expect(output).toContain("• 0 Deletions");
    });
  });

  describe("formatSummary", () => {
    it("should format brief summary", () => {
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
  });
}); 