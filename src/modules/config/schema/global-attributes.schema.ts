import { z } from "zod";

// Shared value schema for dropdown/multiselect/swatch attributes
const attributeValueSchema = z.object({
  name: z.string().min(1, "Attribute value name is required"),
});

// ============================================================================
// PRODUCT ATTRIBUTE SCHEMAS (PRODUCT_TYPE in Saleor API)
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
// CONTENT ATTRIBUTE SCHEMAS (PAGE_TYPE in Saleor API)
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
