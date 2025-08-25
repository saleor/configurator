function formatGenericErrorMessage(message: string | undefined, error: string): string {
  if (!message) {
    return error;
  }

  return `${message}. ${error}`;
}

export const errorFormatHelpers = {
  formatGenericErrorMessage,
};

export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverySuggestions?: string[]
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get recovery suggestions for this error
   * Can be overridden by subclasses for custom suggestions
   */
  getRecoverySuggestions(): string[] {
    if (this.recoverySuggestions && this.recoverySuggestions.length > 0) {
      return this.recoverySuggestions;
    }

    // Import dynamically to avoid circular dependency
    const { ErrorRecoveryGuide } = require("./recovery-guide");
    const suggestions = ErrorRecoveryGuide.getSuggestions(this.message);
    return ErrorRecoveryGuide.formatSuggestions(suggestions);
  }
}

export class EnvironmentVariableError extends BaseError {
  constructor(message: string) {
    super(message, "ENVIRONMENT_VARIABLE_ERROR");
  }
}
