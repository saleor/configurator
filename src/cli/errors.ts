import { BaseError } from "../lib/errors/errors";

class CliError extends BaseError {}

export class CliArgumentError extends CliError {
  constructor(message: string) {
    super(message, "CLI_ARGUMENT_ERROR");
  }
}

export class CliValidationError extends CliError {
  constructor(message: string) {
    super(message, "CLI_VALIDATION_ERROR");
  }
}

class CliFileError extends CliError {}

export class CliFileNotFoundError extends CliFileError {
  constructor(message: string) {
    super(message, "CLI_FILE_NOT_FOUND_ERROR");
  }
}
