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

export class CollectionProductError extends BaseError {
  constructor(
    message: string,
    public collection: string,
    public operation: "assign" | "remove"
  ) {
    super(
      `Failed to ${operation} products for collection "${collection}": ${message}`,
      "COLLECTION_PRODUCT_ERROR"
    );
  }
}

export class CollectionChannelError extends BaseError {
  constructor(
    message: string,
    public collection: string,
    public channel?: string
  ) {
    super(
      `Collection channel error for "${collection}"${channel ? ` in channel "${channel}"` : ""}: ${message}`,
      "COLLECTION_CHANNEL_ERROR"
    );
  }
}
