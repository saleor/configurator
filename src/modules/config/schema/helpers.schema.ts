import { z } from "zod";
import type { MultipleValuesAttribute, SimpleAttribute } from "./attribute.schema";

function isMultipleValuesAttribute(
  attribute: SimpleAttribute
): attribute is MultipleValuesAttribute {
  return (
    attribute.inputType === "DROPDOWN" ||
    attribute.inputType === "MULTISELECT" ||
    attribute.inputType === "SWATCH"
  );
}

export const schemaHelpers = {
  isMultipleValuesAttribute,
};

export function removedInSaleor(version: string) {
  const message = `Removed in Saleor ${version}. Delete this field from config.yml.`;

  return z.never({ error: message }).optional().describe(message);
}
