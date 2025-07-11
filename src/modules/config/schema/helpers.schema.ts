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
