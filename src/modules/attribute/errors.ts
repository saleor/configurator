import { BaseError } from "../../lib/errors/shared";

class AttributeError extends BaseError {}

export class AttributeValidationError extends AttributeError {
  constructor(message: string) {
    super(message, "ATTRIBUTE_VALIDATION_ERROR");
  }
}
