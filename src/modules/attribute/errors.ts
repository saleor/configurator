import { BaseError } from "../../lib/errors/shared";

class AttributeError extends BaseError {}

export class AttributeValidationError extends AttributeError {
  constructor(message: string) {
    super(message, "ATTRIBUTE_VALIDATION_ERROR");
  }
}

export class DuplicateAttributeDefinitionError extends AttributeError {
  constructor(
    message: string,
    public readonly attributeName: string,
    public readonly productTypeName: string
  ) {
    super(message, "DUPLICATE_ATTRIBUTE_DEFINITION_ERROR");
  }
}
