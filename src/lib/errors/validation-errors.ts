import { BaseError } from "./shared";

/**
 * Error thrown when a productType or modelType contains inline attribute definitions
 * instead of references to global productAttributes/contentAttributes sections.
 */
export class InlineAttributeError extends BaseError {
  constructor(
    public readonly entityType: "productTypes" | "modelTypes",
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
      `Run 'saleor-configurator introspect' to generate YAML in the correct format`,
      `Move attribute definitions to the '${this.expectedSection}' section`,
      `Use '{ attribute: "Name" }' references in ${this.entityType}`,
    ];
  }
}

/**
 * Error thrown when an attribute reference cannot be resolved because
 * the attribute doesn't exist in the expected section.
 */
export class AttributeNotFoundError extends BaseError {
  constructor(
    public readonly attributeName: string,
    public readonly expectedSection: "productAttributes" | "contentAttributes",
    public readonly referencingEntityType: "productTypes" | "modelTypes",
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
      `Run 'saleor-configurator introspect' to see existing attributes`
    );

    return suggestions;
  }
}

/**
 * Error thrown when an attribute exists but in the wrong section.
 */
export class WrongAttributeTypeError extends BaseError {
  constructor(
    public readonly attributeName: string,
    public readonly foundInSection: "productAttributes" | "contentAttributes",
    public readonly expectedSection: "productAttributes" | "contentAttributes",
    public readonly referencingEntityType: "productTypes" | "modelTypes",
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
      `Move "${this.attributeName}" from ${this.foundInSection} to ${this.expectedSection}`,
      `Create a separate attribute with this name in ${this.expectedSection}`,
      `Use a different attribute that exists in ${this.expectedSection}`,
    ];
  }
}

/**
 * Error thrown when multiple attributes with the same name exist within a section.
 */
export class DuplicateAttributeError extends BaseError {
  constructor(
    public readonly attributeName: string,
    public readonly section: "productAttributes" | "contentAttributes",
    public readonly occurrenceCount: number
  ) {
    super(
      `Attribute "${attributeName}" is defined ${occurrenceCount} times in ${section}. ` +
        `Attribute names must be unique within each section.`,
      "DUPLICATE_ATTRIBUTE_ERROR"
    );
  }

  override getRecoverySuggestions(): string[] {
    return [
      `Remove duplicate definitions of "${this.attributeName}" from ${this.section}`,
      `Rename one of the attributes to have a unique name`,
    ];
  }
}

/**
 * Calculate Levenshtein distance between two strings.
 * Used for "did you mean" suggestions.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Find similar names from a list based on Levenshtein distance.
 * Returns names that are within a threshold distance (max 3).
 */
export function findSimilarNames(
  target: string,
  candidates: readonly string[],
  maxDistance = 3
): string[] {
  const targetLower = target.toLowerCase();
  const withDistances = candidates
    .map((name) => ({
      name,
      distance: levenshteinDistance(targetLower, name.toLowerCase()),
    }))
    .filter((item) => item.distance <= maxDistance && item.distance > 0)
    .sort((a, b) => a.distance - b.distance);

  return withDistances.map((item) => item.name);
}
