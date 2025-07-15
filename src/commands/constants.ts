/**
 * Exit codes for CLI commands
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CI_DRIFT_DETECTED: 1,
  INVALID_ARGS: 2,
  FILE_NOT_FOUND: 3,
  NETWORK_ERROR: 4,
  PERMISSION_ERROR: 5,
} as const;

/**
 * Output formats supported by commands
 */
export const OUTPUT_FORMATS = ["table", "json", "yaml"] as const;
export type OutputFormat = typeof OUTPUT_FORMATS[number];

/**
 * Validates if a string is a valid output format
 */
export function isValidOutputFormat(format: string): format is OutputFormat {
  return OUTPUT_FORMATS.includes(format as OutputFormat);
}