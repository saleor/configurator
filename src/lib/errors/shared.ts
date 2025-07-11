function formatGenericErrorMessage(
  message: string | undefined,
  error: string
): string {
  if (!message) {
    return error;
  }

  return `${message}. ${error}`;
}

export const errorFormatHelpers = {
  formatGenericErrorMessage,
};

export abstract class BaseError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class EnvironmentVariableError extends BaseError {
  constructor(message: string) {
    super(message, "ENVIRONMENT_VARIABLE_ERROR");
  }
}
