/**
 * Shared constants for diff formatters
 */

/**
 * Fields that when changed are considered breaking changes.
 * These fields affect entity identity or behavior significantly.
 */
export const BREAKING_FIELDS = ["slug", "productType", "inputType", "type"] as const;

/**
 * Interface for formatter limits configuration.
 * Used with `satisfies` to ensure type safety while preserving literal types.
 */
interface FormatterLimitsConfig {
  readonly MAX_ENTITIES_PER_SECTION: number;
  readonly MAX_VALUE_LENGTH: number;
  readonly MAX_FIELD_CHANGES: number;
  readonly MAX_DELETIONS_TO_LIST: number;
}

/**
 * Formatting limits for output to keep it readable
 */
export const FORMATTER_LIMITS = {
  /** Maximum number of entities to show per section before truncating */
  MAX_ENTITIES_PER_SECTION: 10,
  /** Maximum length for displaying values before truncating */
  MAX_VALUE_LENGTH: 30,
  /** Maximum number of field changes to show per entity */
  MAX_FIELD_CHANGES: 3,
  /** Maximum number of deletions to list explicitly */
  MAX_DELETIONS_TO_LIST: 5,
} as const satisfies FormatterLimitsConfig;

/**
 * Checks if a field is considered a breaking change field
 */
export function isBreakingField(field: string): boolean {
  return BREAKING_FIELDS.includes(field as (typeof BREAKING_FIELDS)[number]);
}
