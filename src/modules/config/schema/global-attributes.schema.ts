import { z } from "zod";

// Shared value schema for dropdown/multiselect/swatch attributes
const attributeValueSchema = z.object({
  name: z.string().min(1, "Attribute value name is required"),
});

// ============================================================================
// SHARED GLOBAL ATTRIBUTE SCHEMA
// Both productAttributes and contentAttributes share the same structure.
// The section they appear in determines their Saleor API type
// (PRODUCT_TYPE vs PAGE_TYPE).
// ============================================================================

const baseGlobalAttributeSchema = z.object({
  name: z.string().min(1, "Attribute name is required"),
});

const dropdownGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.literal("DROPDOWN"),
  values: z.array(attributeValueSchema).min(1, "Dropdown attributes must have at least one value"),
});

const multiselectGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.literal("MULTISELECT"),
  values: z
    .array(attributeValueSchema)
    .min(1, "Multiselect attributes must have at least one value"),
});

const swatchGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.literal("SWATCH"),
  values: z.array(attributeValueSchema).min(1, "Swatch attributes must have at least one value"),
});

const referenceGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

const singleReferenceGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.literal("SINGLE_REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

const simpleGlobalAttributeSchema = baseGlobalAttributeSchema.extend({
  inputType: z.enum(["PLAIN_TEXT", "NUMERIC", "DATE", "BOOLEAN", "RICH_TEXT", "DATE_TIME", "FILE"]),
});

const globalAttributeSchema = z.discriminatedUnion("inputType", [
  dropdownGlobalAttributeSchema,
  multiselectGlobalAttributeSchema,
  swatchGlobalAttributeSchema,
  referenceGlobalAttributeSchema,
  singleReferenceGlobalAttributeSchema,
  simpleGlobalAttributeSchema,
]);

// Product and content attributes share the same schema — the section determines the type
export const productAttributeSchema = globalAttributeSchema;
export const contentAttributeSchema = globalAttributeSchema;

export type ProductAttribute = z.infer<typeof productAttributeSchema>;
export type ContentAttribute = z.infer<typeof contentAttributeSchema>;
