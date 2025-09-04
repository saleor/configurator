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
        /Entity type is required for reference attribute ['"]?([^'"]+)['"]?/i,
        (match) => ({
          fix: `Add entityType field to the '${match[1]}' reference attribute in your config`,
          check: "Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT",
          command: "saleor-configurator diff --include=attributes",
        }),
      ],
      [
        /Attribute ['"]?([^'"]+)['"]? not found/i,
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
      [
        /Warehouse ['"]?([\w-]+)['"]? not found/i,
        (match) => ({
          fix: `Ensure warehouse '${match[1]}' exists in your warehouses configuration`,
          check: "Warehouse slugs must match exactly (case-sensitive)",
          command: "saleor-configurator diff --include=warehouses",
        }),
      ],
      [
        /Shipping zone ['"]?([\w\s-]+)['"]? not found/i,
        (match) => ({
          fix: `Ensure shipping zone '${match[1]}' exists in your configuration`,
          check: "Shipping zone names must match exactly",
          command: "saleor-configurator diff --include=shippingZones",
        }),
      ],
      [
        /Tax class ['"]?([\w\s-]+)['"]? (?:not found|doesn't exist)/i,
        (match) => ({
          fix: `Ensure tax class '${match[1]}' exists in your configuration`,
          check: "Tax class names must match exactly",
          command: "saleor-configurator introspect --include=taxes",
        }),
      ],

      // Duplicate/conflict errors
      [
        /Duplicate slug ['"]?([^'"]+)['"]?/i,
        (match) => ({
          fix: `Use a unique slug - '${match[1]}' already exists`,
          check: "View existing entities to find available slugs",
          command: "saleor-configurator introspect",
        }),
      ],
      [
        /already exists with name ['"]?([^'"]+)['"]?/i,
        (match) => ({
          fix: `Entity with name '${match[1]}' already exists - use a different name or update the existing one`,
          check: "View current state",
          command: "saleor-configurator diff",
        }),
      ],
      [
        /Duplicate (\w+) (?:names?|slugs?) found: ([\w\s,]+)/i,
        (match) => ({
          fix: `Remove duplicate ${match[1].toLowerCase()} entries from your config`,
          check: `Each ${match[1].toLowerCase()} must have a unique identifier`,
          command: `saleor-configurator diff --include=${match[1].toLowerCase()}s`,
        }),
      ],
      [
        /SKU ['"]?([\w-]+)['"]? already exists/i,
        (match) => ({
          fix: `Change SKU '${match[1]}' to a unique value`,
          check: "Each product variant must have a unique SKU",
          command: "saleor-configurator introspect --include=products",
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
      [
        /Invalid currency code ['"]?([A-Z]+)['"]?/i,
        (match) => ({
          fix: `Use a valid ISO 4217 currency code instead of '${match[1]}'`,
          check: "Common codes: USD, EUR, GBP, CAD, AUD, JPY",
          command: "See https://en.wikipedia.org/wiki/ISO_4217 for full list",
        }),
      ],
      [
        /Invalid country code ['"]?([A-Z]+)['"]?/i,
        (match) => ({
          fix: `Use a valid ISO 3166-1 alpha-2 country code instead of '${match[1]}'`,
          check: "Common codes: US, GB, DE, FR, CA, AU, JP",
          command: "See https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2 for full list",
        }),
      ],
      [
        /Tax rate must be between 0 and 100/i,
        () => ({
          fix: "Set tax rate as a percentage between 0 and 100",
          check: "Example: rate: 8.5 for 8.5% tax",
          command: "Validate your tax rates in the configuration",
        }),
      ],
      [
        /Invalid country rate for ['"]?([A-Z]+)['"]?: ([\d.]+)/i,
        (match) => ({
          fix: `Fix tax rate for country '${match[1]}' (currently ${match[2]})`,
          check: "Tax rates must be between 0 and 100",
          command: "Update countryRates in your tax configuration",
        }),
      ],
      [
        /At least one country is required/i,
        () => ({
          fix: "Add at least one country code to the shipping zone",
          check: "Use ISO 3166-1 alpha-2 codes (e.g., US, GB, DE)",
          command: "countries: [US, CA, MX]",
        }),
      ],
      [
        /Shipping method (\w+) is required/i,
        (match) => ({
          fix: `Add required field '${match[1].toLowerCase()}' to shipping method`,
          check: "Required fields: name, type, channelListings (with channel and price)",
          command: "See example.yml for shipping method template",
        }),
      ],
      [
        /Failed to create subcategories for ['"]?([\w\s-]+)['"]?/i,
        (match) => ({
          fix: `Check subcategory configuration for parent category '${match[1]}'`,
          check: "Ensure subcategory names and slugs are unique",
          command: "Review category hierarchy in your configuration",
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
      [
        /fetch failed/i,
        () => ({
          fix: "Check your network connection and Saleor instance URL",
          check: "Verify the instance is running and accessible",
          command: "ping your-saleor-instance.com",
        }),
      ],

      // GraphQL errors
      [
        /Variable.*?(\$\w+).*? of type/i,
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

    // Handle null/undefined error messages
    if (!errorMessage) {
      return [
        {
          fix: "Review the error message for details",
          check: "Check your configuration against the current Saleor state",
          command: "saleor-configurator diff --verbose",
        },
      ];
    }

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
   * @throws Error if pattern already exists
   */
  static registerPattern(
    pattern: RegExp,
    getSuggestion: (match: RegExpMatchArray) => RecoverySuggestion
  ): void {
    // Check for duplicate pattern
    for (const existingPattern of ErrorRecoveryGuide.patterns.keys()) {
      if (existingPattern.source === pattern.source && existingPattern.flags === pattern.flags) {
        throw new Error(`Pattern already registered: ${pattern.source}`);
      }
    }

    // Limit total patterns to prevent memory issues
    const MAX_PATTERNS = 100;
    if (ErrorRecoveryGuide.patterns.size >= MAX_PATTERNS) {
      throw new Error(`Maximum number of patterns (${MAX_PATTERNS}) reached`);
    }

    ErrorRecoveryGuide.patterns.set(pattern, getSuggestion);
  }
}
