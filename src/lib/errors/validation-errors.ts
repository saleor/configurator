import { COMMAND_NAME } from "../../meta";
import { BaseError } from "./shared";

export class InlineAttributeError extends BaseError {
  constructor(
    public readonly entityType: "productTypes" | "pageTypes" | "modelTypes",
    public readonly entityName: string,
    public readonly inlineAttributeNames: readonly string[],
    public readonly expectedSection: "productAttributes" | "contentAttributes"
  ) {
    const attrList = inlineAttributeNames.join(", ");
    super(
      `${entityType} "${entityName}" contains inline attribute definitions: ${attrList}. ` +
        `Inline attribute definitions are no longer supported.`,
      "INLINE_ATTRIBUTE_ERROR"
    );
  }

  override getRecoverySuggestions(): string[] {
    return [
      `Run '${COMMAND_NAME} introspect' to generate YAML in the correct format`,
      `Move attribute definitions to the '${this.expectedSection}' section`,
      `Use '{ attribute: "Name" }' references in ${this.entityType}`,
    ];
  }
}

export class AttributeNotFoundError extends BaseError {
  constructor(
    public readonly attributeName: string,
    public readonly expectedSection: "productAttributes" | "contentAttributes",
    public readonly referencingEntityType: "productTypes" | "pageTypes" | "modelTypes",
    public readonly referencingEntityName: string,
    public readonly similarNames?: readonly string[]
  ) {
    super(
      `${referencingEntityType} "${referencingEntityName}" references attribute ` +
        `"${attributeName}" which does not exist in ${expectedSection}.`,
      "ATTRIBUTE_NOT_FOUND_ERROR"
    );
  }

  override getRecoverySuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.similarNames && this.similarNames.length > 0) {
      const similar = this.similarNames.slice(0, 3).join("', '");
      suggestions.push(`Did you mean: '${similar}'?`);
    }

    suggestions.push(
      `Add "${this.attributeName}" to the ${this.expectedSection} section`,
      `Check for typos in the attribute name`,
      `Run '${COMMAND_NAME} introspect' to see existing attributes`
    );

    return suggestions;
  }
}

export class WrongAttributeTypeError extends BaseError {
  constructor(
    public readonly attributeName: string,
    public readonly foundInSection: "productAttributes" | "contentAttributes",
    public readonly expectedSection: "productAttributes" | "contentAttributes",
    public readonly referencingEntityType: "productTypes" | "pageTypes" | "modelTypes",
    public readonly referencingEntityName: string
  ) {
    const foundType = foundInSection === "productAttributes" ? "product" : "content";
    const expectedType = expectedSection === "productAttributes" ? "product" : "content";

    super(
      `${referencingEntityType} "${referencingEntityName}" references attribute ` +
        `"${attributeName}" which exists but is a ${foundType} attribute, not a ${expectedType} attribute.`,
      "WRONG_ATTRIBUTE_TYPE_ERROR"
    );
  }

  override getRecoverySuggestions(): string[] {
    return [
      `Move "${this.attributeName}" from ${this.foundInSection} to ${this.expectedSection} (warning: this will affect all entity types currently using it from ${this.foundInSection})`,
      `Create a separate attribute with a different name in ${this.expectedSection}`,
      `Use a different attribute that already exists in ${this.expectedSection}`,
    ];
  }
}

export { findSimilarNames, levenshteinDistance } from "../utils/string";
