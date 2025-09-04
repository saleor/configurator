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
const patterns: Map<RegExp, (match: RegExpMatchArray) => RecoverySuggestion> = new Map([
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
    /Collection ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Ensure collection '${match[1]}' exists or will be created earlier in deployment`,
      check: "View existing collections",
      command: "saleor-configurator introspect --include=collections",
    }),
  ],
  [
    /Product type ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the product type '${match[1]}' in the productTypes section first`,
      check: "View existing product types",
      command: "saleor-configurator introspect --include=productTypes",
    }),
  ],
  [
    /Page type ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the page type '${match[1]}' in the pageTypes section first`,
      check: "View existing page types",
      command: "saleor-configurator introspect --include=pageTypes",
    }),
  ],

  // Duplicate entity errors
  [
    /Duplicate.*['"]?(.+?)['"]?.*found/i,
    (match) => ({
      fix: `Remove duplicate '${match[1]}' from your configuration`,
      check: "Search for the duplicate entity name",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // Permission errors
  [
    /Permission denied|You do not have permission/i,
    () => ({
      fix: "Check your Saleor API token has the required permissions",
      check: "Ensure you have admin permissions for the operations you're trying to perform",
      command: "saleor-configurator introspect --include=shop",
    }),
  ],

  // Network errors
  [
    /Network error|Connection failed|ECONNREFUSED/i,
    () => ({
      fix: "Check your Saleor API URL and network connection",
      check: "Verify the SALEOR_API_URL environment variable is correct",
      command: "curl -I $SALEOR_API_URL/graphql/",
    }),
  ],

  // Authentication errors
  [
    /Authentication failed|Invalid token|Unauthorized/i,
    () => ({
      fix: "Check your Saleor API token is valid and not expired",
      check: "Verify the SALEOR_BEARER_TOKEN environment variable is set correctly",
      command: "saleor-configurator introspect --include=shop",
    }),
  ],

  // Validation errors
  [
    /is required/i,
    () => ({
      fix: "Add the required field to your configuration",
      check: "Review the configuration schema documentation",
      command: "saleor-configurator --help",
    }),
  ],
  [
    /must be unique/i,
    () => ({
      fix: "Ensure all entity names/slugs are unique within their type",
      check: "Review your configuration for duplicate names or slugs",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // Deployment errors
  [
    /Entity.*failed.*validation/i,
    () => ({
      fix: "Fix the validation error in your configuration",
      check: "Review the entity definition and ensure all required fields are present",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // Currency/Country errors
  [
    /Invalid currency code ['"]?([^'"]+)['"]?/i,
    (match) => ({
      fix: `Use a valid ISO 4217 currency code instead of '${match[1]}'`,
      check: "Common codes: USD, EUR, GBP, JPY, etc.",
      command: "saleor-configurator introspect --include=channels",
    }),
  ],
  [
    /Invalid country code ['"]?([^'"]+)['"]?/i,
    (match) => ({
      fix: `Use a valid ISO 3166-1 alpha-2 country code instead of '${match[1]}'`,
      check: "Common codes: US, GB, DE, FR, etc.",
      command: "saleor-configurator introspect --include=channels",
    }),
  ],

  // Tax class errors
  [
    /Tax class ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the tax class '${match[1]}' in the taxClasses section first`,
      check: "View existing tax classes",
      command: "saleor-configurator introspect --include=taxClasses",
    }),
  ],

  // Warehouse errors
  [
    /Warehouse ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the warehouse '${match[1]}' in the warehouses section first`,
      check: "View existing warehouses",
      command: "saleor-configurator introspect --include=warehouses",
    }),
  ],

  // Shipping zone errors
  [
    /Shipping zone ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the shipping zone '${match[1]}' in the shippingZones section first`,
      check: "View existing shipping zones",
      command: "saleor-configurator introspect --include=shippingZones",
    }),
  ],

  // Channel errors
  [
    /Channel ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the channel '${match[1]}' in the channels section first`,
      check: "View existing channels",
      command: "saleor-configurator introspect --include=channels",
    }),
  ],

  // Generic configuration errors
  [
    /Configuration.*invalid/i,
    () => ({
      fix: "Review your YAML configuration for syntax errors",
      check: "Ensure proper YAML formatting and indentation",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // File errors
  [
    /ENOENT.*config/i,
    () => ({
      fix: "Create a config.yml file in your project directory",
      check: "Run the start command to generate a sample configuration",
      command: "saleor-configurator start",
    }),
  ],

  // Unknown GraphQL errors
  [
    /GraphQL error/i,
    () => ({
      fix: "Review the GraphQL error details for specific field issues",
      check: "Verify your configuration matches the current Saleor schema",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // Schema version mismatch
  [
    /Unsupported.*version|Schema.*mismatch/i,
    () => ({
      fix: "Update your configurator to match your Saleor version",
      check: "Verify your Saleor instance version matches the configurator requirements",
      command: "npm update @saleor/configurator",
    }),
  ],

  // Rate limiting
  [
    /Rate limit|Too many requests/i,
    () => ({
      fix: "Wait a few seconds and retry the operation",
      check: "Consider batching large operations or adding delays",
      command: "saleor-configurator deploy --verbose",
    }),
  ],
]);

/**
 * Get recovery suggestions for an error message
 */
export function getSuggestions(errorMessage: string | undefined | null): RecoverySuggestion[] {
  if (!errorMessage || typeof errorMessage !== "string") {
    return [
      {
        fix: "Review the error for details",
        command: "saleor-configurator diff --verbose",
      },
    ];
  }

  const suggestions: RecoverySuggestion[] = [];

  for (const [pattern, getSuggestion] of patterns) {
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
export function formatSuggestions(suggestions: RecoverySuggestion[]): string[] {
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
export function registerPattern(
  pattern: RegExp,
  getSuggestion: (match: RegExpMatchArray) => RecoverySuggestion
): void {
  // Check for duplicate pattern
  for (const existingPattern of patterns.keys()) {
    if (existingPattern.source === pattern.source && existingPattern.flags === pattern.flags) {
      throw new Error(`Pattern already registered: ${pattern.source}`);
    }
  }

  // Limit total patterns to prevent memory issues
  const MAX_PATTERNS = 100;
  if (patterns.size >= MAX_PATTERNS) {
    throw new Error(`Maximum number of patterns (${MAX_PATTERNS}) reached`);
  }

  patterns.set(pattern, getSuggestion);
}

// Keep the class as a namespace for backward compatibility
export const ErrorRecoveryGuide = {
  getSuggestions,
  formatSuggestions,
  registerPattern,
};
