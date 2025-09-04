import { BaseError } from "../../lib/errors/shared";

export class WarehouseError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "WAREHOUSE_ERROR", recoverySuggestions);
  }
}

export class WarehouseNotFoundError extends WarehouseError {
  constructor(identifier: string) {
    super(`Warehouse not found: ${identifier}`);
  }
}

export class WarehouseValidationError extends WarehouseError {
  constructor(message: string, field?: string) {
    const fullMessage = field ? `Warehouse validation failed for field '${field}': ${message}` : `Warehouse validation failed: ${message}`;
    super(fullMessage);
  }
}

export class WarehouseOperationError extends WarehouseError {
  constructor(operation: string, warehouseName: string, reason: string) {
    super(`Failed to ${operation} warehouse '${warehouseName}': ${reason}`);
  }
}
