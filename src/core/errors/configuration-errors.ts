import { BaseError } from "../../lib/errors/shared";

/**
 * Error thrown when configuration validation fails
 */
export class ConfigurationValidationError extends BaseError {
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
export class ConfigurationLoadError extends BaseError {
  constructor(message: string) {
    super(message, "CONFIG_LOAD_ERROR");
  }
}

/**
 * Error thrown when remote configuration retrieval fails
 */
export class RemoteConfigurationError extends BaseError {
  constructor(message: string) {
    super(message, "REMOTE_CONFIG_ERROR");
  }
}
