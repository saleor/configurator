/**
 * Contract: Zod Schemas for Global Attributes
 *
 * This file defines the contracts for the new YAML schema structure.
 * These schemas will be implemented in src/modules/config/schema/
 */

import { z } from "zod";

// ============================================================================
// ATTRIBUTE VALUE SCHEMA (shared)
// ============================================================================

export const attributeValueSchema = z.object({
  name: z.string().min(1, "Attribute value name is required"),
});

// ============================================================================
// PRODUCT ATTRIBUTE SCHEMAS
// ============================================================================

const baseProductAttributeSchema = z.object({
  name: z.string().min(1, "Attribute name is required"),
});

const dropdownProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("DROPDOWN"),
  values: z.array(attributeValueSchema).min(1, "Dropdown attributes must have at least one value"),
});

const multiselectProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("MULTISELECT"),
  values: z
    .array(attributeValueSchema)
    .min(1, "Multiselect attributes must have at least one value"),
});

const swatchProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("SWATCH"),
  values: z.array(attributeValueSchema).min(1, "Swatch attributes must have at least one value"),
});

const referenceProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

const simpleProductAttributeSchema = baseProductAttributeSchema.extend({
  inputType: z.enum(["PLAIN_TEXT", "NUMERIC", "DATE", "BOOLEAN", "RICH_TEXT", "DATE_TIME", "FILE"]),
});

export const productAttributeSchema = z.discriminatedUnion("inputType", [
  dropdownProductAttributeSchema,
  multiselectProductAttributeSchema,
  swatchProductAttributeSchema,
  referenceProductAttributeSchema,
  simpleProductAttributeSchema,
]);

export type ProductAttribute = z.infer<typeof productAttributeSchema>;

// ============================================================================
// CONTENT ATTRIBUTE SCHEMAS
// ============================================================================

const baseContentAttributeSchema = z.object({
  name: z.string().min(1, "Attribute name is required"),
});

const dropdownContentAttributeSchema = baseContentAttributeSchema.extend({
  inputType: z.literal("DROPDOWN"),
  values: z.array(attributeValueSchema).min(1, "Dropdown attributes must have at least one value"),
});

const multiselectContentAttributeSchema = baseContentAttributeSchema.extend({
  inputType: z.literal("MULTISELECT"),
  values: z
    .array(attributeValueSchema)
    .min(1, "Multiselect attributes must have at least one value"),
});

const swatchContentAttributeSchema = baseContentAttributeSchema.extend({
  inputType: z.literal("SWATCH"),
  values: z.array(attributeValueSchema).min(1, "Swatch attributes must have at least one value"),
});

const referenceContentAttributeSchema = baseContentAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

const simpleContentAttributeSchema = baseContentAttributeSchema.extend({
  inputType: z.enum(["PLAIN_TEXT", "NUMERIC", "DATE", "BOOLEAN", "RICH_TEXT", "DATE_TIME", "FILE"]),
});

export const contentAttributeSchema = z.discriminatedUnion("inputType", [
  dropdownContentAttributeSchema,
  multiselectContentAttributeSchema,
  swatchContentAttributeSchema,
  referenceContentAttributeSchema,
  simpleContentAttributeSchema,
]);

export type ContentAttribute = z.infer<typeof contentAttributeSchema>;

// ============================================================================
// ATTRIBUTE REFERENCE SCHEMA (existing, for productTypes/modelTypes)
// ============================================================================

export const attributeReferenceSchema = z
  .object({
    attribute: z.string().min(1, "Attribute reference name is required"),
    variantSelection: z.boolean().optional(),
  })
  .describe("Reference to an attribute defined in productAttributes or contentAttributes");

export type AttributeReference = z.infer<typeof attributeReferenceSchema>;

// ============================================================================
// UPDATED CONFIG SCHEMA (partial, showing new sections)
// ============================================================================

export const updatedConfigSchemaSections = z.object({
  // NEW: Product attributes section (replaces `attributes` for PRODUCT_TYPE)
  productAttributes: z
    .array(productAttributeSchema)
    .optional()
    .describe(
      "Product attributes (PRODUCT_TYPE in Saleor API) that can be referenced by productTypes. " +
        "These are created before productTypes are processed."
    ),

  // NEW: Content attributes section (replaces `attributes` for PAGE_TYPE)
  contentAttributes: z
    .array(contentAttributeSchema)
    .optional()
    .describe(
      "Content attributes (PAGE_TYPE in Saleor API) that can be referenced by modelTypes. " +
        "These are created before modelTypes are processed."
    ),

  // EXISTING: productTypes now only accept references (not inline definitions)
  productTypes: z
    .array(
      z.object({
        name: z.string(),
        isShippingRequired: z.boolean().optional().default(false),
        taxClass: z.string().optional(),
        productAttributes: z
          .array(attributeReferenceSchema)
          .optional()
          .describe("References to attributes defined in productAttributes section"),
        variantAttributes: z
          .array(attributeReferenceSchema)
          .optional()
          .describe("References to attributes defined in productAttributes section"),
      })
    )
    .optional(),

  // EXISTING: modelTypes now only accept references (not inline definitions)
  modelTypes: z
    .array(
      z.object({
        name: z.string(),
        slug: z.string().optional(),
        attributes: z
          .array(attributeReferenceSchema)
          .optional()
          .describe("References to attributes defined in contentAttributes section"),
      })
    )
    .optional(),

  // REMOVED: The unified `attributes` section is no longer supported
  // attributes: z.array(fullAttributeSchema).optional(),  // <- DELETED
});

// ============================================================================
// VALIDATION HELPER TYPES
// ============================================================================

/**
 * Type guard to check if an attribute definition is a reference
 */
export function isAttributeReference(attr: unknown): attr is AttributeReference {
  return (
    typeof attr === "object" &&
    attr !== null &&
    "attribute" in attr &&
    typeof (attr as AttributeReference).attribute === "string"
  );
}

/**
 * Type guard to check if an attribute definition is inline (not a reference)
 */
export function isInlineAttributeDefinition(attr: unknown): boolean {
  return typeof attr === "object" && attr !== null && "inputType" in attr && !("attribute" in attr);
}
