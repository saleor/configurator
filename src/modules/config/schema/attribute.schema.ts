import { z } from "zod";

const attributeValueSchema = z.object({
  name: z.string(),
});

const attributeTypeSchema = z.enum(["PRODUCT_TYPE", "PAGE_TYPE"]);

// Base attribute fields that are common to all types
const baseAttributeSchema = z.object({
  name: z.string(),
});

// Schema for attributes with multiple values (dropdown, multiselect, swatch)
const multipleValuesAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum(["DROPDOWN", "MULTISELECT", "SWATCH"]),
  values: z.array(attributeValueSchema),
});

export type MultipleValuesAttribute = z.infer<typeof multipleValuesAttributeSchema>;

// Schema for reference type attributes (multiple references)
const referenceAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

// Schema for single reference type attributes
const singleReferenceAttributeSchema = baseAttributeSchema.extend({
  inputType: z.literal("SINGLE_REFERENCE"),
  entityType: z.enum(["PAGE", "PRODUCT", "PRODUCT_VARIANT"]),
});

// Schema for simple value attributes
const singleAttributeSchema = baseAttributeSchema.extend({
  inputType: z.enum(["PLAIN_TEXT", "NUMERIC", "DATE", "BOOLEAN", "RICH_TEXT", "DATE_TIME", "FILE"]),
});

// Combined attribute schema using discriminted union based on inputType
export const simpleAttributeSchema = z.discriminatedUnion("inputType", [
  multipleValuesAttributeSchema,
  referenceAttributeSchema,
  singleReferenceAttributeSchema,
  singleAttributeSchema,
]);

export type SimpleAttribute = z.infer<typeof simpleAttributeSchema>;

export const referencedAttributeSchema = z
  .object({
    attribute: z.string(), // ? maybe should be called "slug"
  })
  .describe("Reference to an existing attribute by slug");

export const attributeInputSchema = z.union([simpleAttributeSchema, referencedAttributeSchema]);

export type AttributeInput = z.infer<typeof attributeInputSchema>;

export const fullAttributeSchema = simpleAttributeSchema.and(
  z.object({
    type: attributeTypeSchema,
  })
);

export type FullAttribute = z.infer<typeof fullAttributeSchema>;
