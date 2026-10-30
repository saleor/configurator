import { BaseError } from "../../lib/errors/shared";

export class CollectionOperationError extends BaseError {
  constructor(
    public operation: "create" | "update" | "fetch" | "bootstrap",
    public collection: string,
    public details?: string
  ) {
    super(
      `Failed to ${operation} collection "${collection}"${details ? `: ${details}` : ""}`,
      "COLLECTION_OPERATION_ERROR"
    );
  }
}

export class CollectionValidationError extends BaseError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(
      field ? `Collection validation error in field "${field}": ${message}` : message,
      "COLLECTION_VALIDATION_ERROR"
    );
  }
}
