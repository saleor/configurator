import { BaseError } from "../../lib/errors/shared";

class WarehouseError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "WAREHOUSE_ERROR", recoverySuggestions);
  }
}

export class WarehouseValidationError extends WarehouseError {
  constructor(message: string, _field?: string) {
    super(`Warehouse validation failed: ${message}`);
  }
}

export class WarehouseOperationError extends WarehouseError {
  constructor(operation: string, warehouseName: string, reason: string) {
    super(`Failed to ${operation} warehouse '${warehouseName}': ${reason}`);
  }
}
