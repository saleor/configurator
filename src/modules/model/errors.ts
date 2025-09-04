import { BaseError } from "../../lib/errors/shared";

export class ModelOperationError extends BaseError {
  constructor(
    public operation: "create" | "update" | "fetch" | "bootstrap",
    public model: string,
    public details?: string
  ) {
    super(
      `Failed to ${operation} model "${model}"${details ? `: ${details}` : ""}`,
      "MODEL_OPERATION_ERROR"
    );
  }
}

export class ModelValidationError extends BaseError {
  constructor(message: string, public field?: string) {
    super(
      field ? `Model validation error in field "${field}": ${message}` : message,
      "MODEL_VALIDATION_ERROR"
    );
  }
}

export class ModelAttributeError extends BaseError {
  constructor(
    message: string,
    public model: string,
    public attribute?: string
  ) {
    super(
      `Model attribute error for "${model}"${attribute ? ` (attribute: "${attribute}")` : ""}: ${message}`,
      "MODEL_ATTRIBUTE_ERROR"
    );
  }
}

export class ModelTypeError extends BaseError {
  constructor(
    message: string,
    public model: string,
    public modelType: string
  ) {
    super(
      `Model type error for "${model}" with type "${modelType}": ${message}`,
      "MODEL_TYPE_ERROR"
    );
  }
}