/**
 * CLI Error Types and Interfaces
 *
 * This module defines all error-related types and interfaces used throughout the CLI system.
 * It provides a clean separation of error concerns and makes error handling more predictable.
 */

export interface CliError extends Error {
  readonly isCliError: true;
  readonly helpText?: string;
}

export interface ValidationError extends CliError {
  readonly field: string;
  readonly value: unknown;
  readonly expectedType: string;
}

export interface HelpDisplayOptions {
  readonly commandName: string;
  readonly schema: import("zod").ZodObject<import("zod").ZodRawShape>;
}

/**
 * Type guard to check if an error is a CLI error
 */
export function isCliError(error: unknown): error is CliError {
  return error instanceof Error && "isCliError" in error && error.isCliError === true;
}

/**
 * Type guard to check if an error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return isCliError(error) && "field" in error && "expectedType" in error;
}
