import { BaseError } from "../../lib/errors/shared";

export class MenuOperationError extends BaseError {
  constructor(
    public operation: "create" | "update" | "fetch" | "bootstrap",
    public menu: string,
    public details?: string
  ) {
    super(
      `Failed to ${operation} menu "${menu}"${details ? `: ${details}` : ""}`,
      "MENU_OPERATION_ERROR"
    );
  }
}

export class MenuValidationError extends BaseError {
  constructor(
    message: string,
    public field?: string
  ) {
    super(
      field ? `Menu validation error in field "${field}": ${message}` : message,
      "MENU_VALIDATION_ERROR"
    );
  }
}

export class MenuError extends BaseError {
  constructor(message: string) {
    super(message, "MENU_ERROR");
  }
}
