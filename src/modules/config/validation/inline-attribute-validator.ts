import { InlineAttributeError } from "../../../lib/errors/validation-errors";
import type { SaleorConfig } from "../schema/schema";

/**
 * Type guard to check if an attribute definition is a reference (only has 'attribute' key).
 * References look like: { attribute: "Name" } or { attribute: "Name", variantSelection: true }
 */
export function isAttributeReference(attr: unknown): attr is { attribute: string } {
  return (
    typeof attr === "object" &&
    attr !== null &&
    "attribute" in attr &&
    typeof (attr as { attribute: unknown }).attribute === "string"
  );
}

/**
 * Type guard to check if an attribute definition is inline (has inputType, not a reference).
 * Inline definitions have 'inputType' and 'name' fields directly.
 */
export function isInlineAttributeDefinition(attr: unknown): boolean {
  return (
    typeof attr === "object" &&
    attr !== null &&
    "inputType" in attr &&
    "name" in attr &&
    !("attribute" in attr)
  );
}

/**
 * Extract inline attribute names from a list of attribute definitions.
 */
export function extractInlineAttributeNames(attrs: unknown[]): string[] {
  return attrs.filter(isInlineAttributeDefinition).map((attr) => (attr as { name: string }).name);
}

/**
 * Validates that no inline attribute definitions exist in productTypes or modelTypes.
 * Returns an array of InlineAttributeError instances for any violations found.
 */
export function validateNoInlineDefinitions(config: SaleorConfig): InlineAttributeError[] {
  const errors: InlineAttributeError[] = [];

  // Check productTypes
  for (const pt of config.productTypes ?? []) {
    const inlineProductAttrs = extractInlineAttributeNames(pt.productAttributes ?? []);
    const inlineVariantAttrs = extractInlineAttributeNames(pt.variantAttributes ?? []);
    const allInlineAttrs = [...inlineProductAttrs, ...inlineVariantAttrs];

    if (allInlineAttrs.length > 0) {
      errors.push(
        new InlineAttributeError("productTypes", pt.name, allInlineAttrs, "productAttributes")
      );
    }
  }

  // Check modelTypes
  for (const mt of config.modelTypes ?? []) {
    const inlineAttrs = extractInlineAttributeNames(mt.attributes ?? []);

    if (inlineAttrs.length > 0) {
      errors.push(
        new InlineAttributeError("modelTypes", mt.name, inlineAttrs, "contentAttributes")
      );
    }
  }

  return errors;
}

/**
 * Check if a config has any inline attribute definitions.
 */
export function hasInlineAttributeDefinitions(config: SaleorConfig): boolean {
  return validateNoInlineDefinitions(config).length > 0;
}
