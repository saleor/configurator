import { BaseError } from "../../lib/errors/shared";

export class ConfigError extends BaseError {}

export class UnsupportedInputTypeError extends ConfigError {
  constructor(message: string) {
    super(message, "UNSUPPORTED_INPUT_TYPE_ERROR");
  }
}

export class EntityNotFoundError extends ConfigError {
  constructor(message: string) {
    super(message, "ENTITY_NOT_FOUND_ERROR");
  }
}
