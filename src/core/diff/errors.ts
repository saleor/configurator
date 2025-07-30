import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for diff-related errors
 */
export class DiffError extends BaseError {}

/**
 * Error thrown when entity validation fails
 */
export class EntityValidationError extends DiffError {
  constructor(message: string) {
    super(message, "ENTITY_VALIDATION_ERROR");
  }
}

/**
 * Error thrown when diff comparison fails
 */
export class DiffComparisonError extends DiffError {
  constructor(message: string) {
    super(message, "DIFF_COMPARISON_ERROR");
  }
}

export class DiffSummaryError extends DiffError {
  constructor(message: string) {
    super(message, "DIFF_SUMMARY_ERROR");
  }
}
