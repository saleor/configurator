import { describe, expect, it } from "vitest";
import { scanForDuplicateIdentifiers, validateNoDuplicateIdentifiers } from "./preflight";
import type { SaleorConfig } from "../../modules/config/schema/schema";

describe("Duplicate preflight validation", () => {
  it("scans and returns duplicate issues", () => {
    // Arrange
    const cfg = {
      channels: [
        { slug: "default", name: "Default", currencyCode: "USD", defaultCountry: "US" },
        { slug: "default", name: "Default 2", currencyCode: "USD", defaultCountry: "US" },
      ],
      products: [
        { name: "A", slug: "p-1", productType: "T", category: "c", variants: [] },
        { name: "B", slug: "p-1", productType: "T", category: "c", variants: [] },
      ],
    } as unknown as SaleorConfig;

    // Act
    const issues = scanForDuplicateIdentifiers(cfg);

    // Assert
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ section: "channels", identifier: "default" }),
        expect.objectContaining({ section: "products", identifier: "p-1" }),
      ])
    );
  });

  it("throws a validation error when duplicates exist", () => {
    // Arrange
    const cfg = {
      products: [
        { name: "A", slug: "dup", productType: "T", category: "c", variants: [] },
        { name: "B", slug: "dup", productType: "T", category: "c", variants: [] },
      ],
    } as unknown as SaleorConfig;

    // Act + Assert
    expect(() => validateNoDuplicateIdentifiers(cfg, "config.yml")).toThrow(
      /Duplicate entity identifiers found/
    );
  });
});

