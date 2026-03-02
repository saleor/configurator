import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../../modules/config/schema/schema";
import {
  runPreflightValidation,
  scanForDuplicateIdentifiers,
  validateAttributeReferences,
  validateNoCrossSectionDuplicates,
  validateNoDuplicateIdentifiers,
} from "./preflight";

describe("Duplicate preflight validation", () => {
  it("scans and returns duplicate issues", () => {
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

    const issues = scanForDuplicateIdentifiers(cfg);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ section: "channels", identifier: "default" }),
        expect.objectContaining({ section: "products", identifier: "p-1" }),
      ])
    );
  });

  it("throws a validation error when duplicates exist", () => {
    const cfg = {
      products: [
        { name: "A", slug: "dup", productType: "T", category: "c", variants: [] },
        { name: "B", slug: "dup", productType: "T", category: "c", variants: [] },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateNoDuplicateIdentifiers(cfg, "config.yml")).toThrow(
      /Duplicate entity identifiers found/
    );
  });
});

describe("validateNoCrossSectionDuplicates", () => {
  it("throws when attribute name appears in both sections", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      contentAttributes: [{ name: "Color", inputType: "PLAIN_TEXT" }],
    } as unknown as SaleorConfig;

    expect(() => validateNoCrossSectionDuplicates(cfg, "config.yml")).toThrow(
      /unique across productAttributes and contentAttributes/
    );
  });

  it("passes when no overlap between sections", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
    } as unknown as SaleorConfig;

    expect(() => validateNoCrossSectionDuplicates(cfg, "config.yml")).not.toThrow();
  });

  it("passes when sections are empty", () => {
    const cfg = {} as SaleorConfig;
    expect(() => validateNoCrossSectionDuplicates(cfg, "config.yml")).not.toThrow();
  });
});

describe("validateAttributeReferences", () => {
  it("passes when productType refs match productAttributes", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).not.toThrow();
  });

  it("throws when productType refs non-existent attribute", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Size" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).toThrow(
      /Unresolved attribute references/
    );
  });

  it("throws when pageType refs attribute not in contentAttributes", () => {
    const cfg = {
      contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
      pageTypes: [
        {
          name: "Blog",
          attributes: [{ attribute: "MissingAttr" }],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).toThrow(
      /Unresolved attribute references/
    );
  });

  it("passes when no refs and no global sections (no-op)", () => {
    const cfg = {
      productTypes: [{ name: "Simple", productAttributes: [], variantAttributes: [] }],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).not.toThrow();
  });

  it("throws when no global sections but refs exist (Task 1.2 fix)", () => {
    const cfg = {
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).toThrow(
      /Unresolved attribute references/
    );
  });

  it("throws when modelType refs attribute not in contentAttributes", () => {
    const cfg = {
      contentAttributes: [],
      modelTypes: [
        {
          name: "FAQ",
          attributes: [{ attribute: "Question" }],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => validateAttributeReferences(cfg, "config.yml")).toThrow(
      /Unresolved attribute references/
    );
  });
});

describe("runPreflightValidation", () => {
  it("does not throw when config is valid", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => runPreflightValidation(cfg, "config.yml")).not.toThrow();
  });

  it("throws single error directly when only one validation fails", () => {
    const cfg = {
      productAttributes: [{ name: "Color", inputType: "DROPDOWN" }],
      contentAttributes: [{ name: "Color", inputType: "PLAIN_TEXT" }],
    } as unknown as SaleorConfig;

    expect(() => runPreflightValidation(cfg, "config.yml")).toThrow(
      /unique across productAttributes and contentAttributes/
    );
  });

  it("throws combined error when multiple validations fail", () => {
    const cfg = {
      productAttributes: [
        { name: "Color", inputType: "DROPDOWN" },
        { name: "Color", inputType: "DROPDOWN" },
      ],
      contentAttributes: [{ name: "Color", inputType: "PLAIN_TEXT" }],
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Missing" }],
          variantAttributes: [],
        },
      ],
    } as unknown as SaleorConfig;

    expect(() => runPreflightValidation(cfg, "config.yml")).toThrow(
      /Multiple validation errors found/
    );
  });
});
