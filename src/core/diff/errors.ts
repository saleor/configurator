import { BaseError } from "../../lib/errors/shared";

/**
 * Base error class for diff-related errors
 */
export class DiffError extends BaseError {}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigurationValidationError extends DiffError {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly validationErrors: { path: string; message: string }[]
  ) {
    super(message, "CONFIG_VALIDATION_ERROR");
  }
}

/**
 * Error thrown when configuration loading fails
 */
export class ConfigurationLoadError extends DiffError {
  constructor(message: string) {
    super(message, "CONFIG_LOAD_ERROR");
  }
}

/**
 * Error thrown when remote configuration retrieval fails
 */
export class RemoteConfigurationError extends DiffError {
  constructor(message: string) {
    super(message, "REMOTE_CONFIG_ERROR");
  }
}

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
