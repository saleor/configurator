/**
 * Error recovery guide system for providing actionable suggestions to users
 */

export interface RecoverySuggestion {
  fix: string;
  check?: string;
  command?: string;
}

/**
 * Registry of error patterns and their recovery suggestions
 */
export class ErrorRecoveryGuide {
  private static readonly patterns: Map<RegExp, (match: RegExpMatchArray) => RecoverySuggestion> =
    new Map([
      // Attribute errors
      [
        /Entity type is required for reference attribute ['"]?(\w+)['"]?/i,
        (match) => ({
          fix: `Add entityType field to the '${match[1]}' reference attribute in your config`,
          check: "Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT",
          command: "saleor-configurator diff --include=attributes",
        }),
      ],
      [
        /Attribute ['"]?(\w+)['"]? not found/i,
        (match) => ({
          fix: `Create the attribute '${match[1]}' first or reference an existing one`,
          check: "View available attributes",
          command: "saleor-configurator introspect --include=attributes",
        }),
      ],
      [
        /Failed to resolve referenced attributes/i,
        () => ({
          fix: "Ensure referenced attributes exist and match the correct type (PRODUCT_TYPE or PAGE_TYPE)",
          check: "List all available attributes",
          command: "saleor-configurator introspect --include=attributes",
        }),
      ],

      // Entity not found errors
      [
        /Category ['"]?(.+?)['"]? not found/i,
        (match) => ({
          fix: `Ensure category '${match[1]}' exists or will be created earlier in deployment`,
          check: "View existing categories",
          command: "saleor-configurator introspect --include=categories",
        }),
      ],
      [
        /Channel ['"]?(.+?)['"]? not found/i,
        (match) => ({
          fix: `Ensure channel '${match[1]}' exists or is defined in your config`,
          check: "View existing channels",
          command: "saleor-configurator introspect --include=channels",
        }),
      ],
      [
        /Product type ['"]?(.+?)['"]? not found/i,
        (match) => ({
          fix: `Ensure product type '${match[1]}' exists or is defined before products that use it`,
          check: "View existing product types",
          command: "saleor-configurator introspect --include=productTypes",
        }),
      ],

      // Duplicate/conflict errors
      [
        /Duplicate slug ['"]?(.+?)['"]?/i,
        (match) => ({
          fix: `Use a unique slug - '${match[1]}' already exists`,
          check: "View existing entities to find available slugs",
          command: "saleor-configurator introspect",
        }),
      ],
      [
        /already exists with name ['"]?(.+?)['"]?/i,
        (match) => ({
          fix: `Entity with name '${match[1]}' already exists - use a different name or update the existing one`,
          check: "View current state",
          command: "saleor-configurator diff",
        }),
      ],

      // Validation errors
      [
        /(\w+) is required/i,
        (match) => ({
          fix: `Add the required field '${match[1]}' to your configuration`,
          check: "Review the schema documentation",
          command: "cat SCHEMA.md",
        }),
      ],
      [
        /Invalid (\w+) value/i,
        (match) => ({
          fix: `Check that the ${match[1]} field has a valid value according to the schema`,
          check: "Review valid values in schema documentation",
        }),
      ],

      // Permission errors
      [
        /permission denied|unauthorized|forbidden/i,
        () => ({
          fix: "Check that your API token has the required permissions",
          check: "Verify token permissions in Saleor dashboard",
          command: "saleor-configurator diff --token YOUR_TOKEN",
        }),
      ],

      // Network errors
      [
        /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,
        () => ({
          fix: "Check your network connection and Saleor instance URL",
          check: "Verify the instance is accessible",
          command: "curl -I YOUR_SALEOR_URL/graphql/",
        }),
      ],

      // GraphQL errors
      [
        /Variable ["$](\w+)["']? of type/i,
        (match) => ({
          fix: `Check the ${match[1]} field type matches the GraphQL schema`,
          check: "This might be a version mismatch between configurator and Saleor",
        }),
      ],
    ]);

  /**
   * Get recovery suggestions for an error message
   */
  static getSuggestions(errorMessage: string): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    for (const [pattern, getSuggestion] of ErrorRecoveryGuide.patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        suggestions.push(getSuggestion(match));
      }
    }

    // Add generic suggestion if no specific patterns matched
    if (suggestions.length === 0) {
      suggestions.push({
        fix: "Review the error message for details",
        check: "Check your configuration against the current Saleor state",
        command: "saleor-configurator diff --verbose",
      });
    }

    return suggestions;
  }

  /**
   * Format suggestions for display
   */
  static formatSuggestions(suggestions: RecoverySuggestion[]): string[] {
    return suggestions.flatMap((suggestion) => {
      const lines: string[] = [];
      if (suggestion.fix) {
        lines.push(`→ Fix: ${suggestion.fix}`);
      }
      if (suggestion.check) {
        lines.push(`→ Check: ${suggestion.check}`);
      }
      if (suggestion.command) {
        lines.push(`→ Run: ${suggestion.command}`);
      }
      return lines;
    });
  }

  /**
   * Register a custom error pattern and recovery suggestion
   */
  static registerPattern(
    pattern: RegExp,
    getSuggestion: (match: RegExpMatchArray) => RecoverySuggestion
  ): void {
    ErrorRecoveryGuide.patterns.set(pattern, getSuggestion);
  }
}