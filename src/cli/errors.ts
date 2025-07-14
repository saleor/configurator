import { BaseError } from "../lib/errors/shared";

class CliError extends BaseError {}

export class CliArgumentError extends CliError {
  constructor(message: string) {
    super(message, "CLI_ARGUMENT_ERROR");
  }
}
