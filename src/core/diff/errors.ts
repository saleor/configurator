/**
 * Base error class for diff-related errors
 */
export abstract class DiffError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

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
  constructor(
    message: string,
    public readonly filePath?: string
  ) {
    super(message, "CONFIG_LOAD_ERROR");
  }
}

/**
 * Error thrown when remote configuration retrieval fails
 */
export class RemoteConfigurationError extends DiffError {
  constructor(
    message: string,
    public readonly originalError?: Error
  ) {
    super(message, "REMOTE_CONFIG_ERROR");
  }
}

/**
 * Error thrown when entity validation fails
 */
export class EntityValidationError extends DiffError {
  constructor(
    message: string,
    public readonly entityType: string,
    public readonly entityName?: string
  ) {
    super(message, "ENTITY_VALIDATION_ERROR");
  }
}

/**
 * Error thrown when diff comparison fails
 */
export class DiffComparisonError extends DiffError {
  constructor(
    message: string,
    public readonly entityType?: string,
    public readonly originalError?: Error
  ) {
    super(message, "DIFF_COMPARISON_ERROR");
  }
}
