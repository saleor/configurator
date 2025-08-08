import { BaseError } from "../../lib/errors/shared";

export class WarehouseError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "WAREHOUSE_ERROR", details);
  }
}

export class WarehouseNotFoundError extends WarehouseError {
  constructor(identifier: string) {
    super(`Warehouse not found: ${identifier}`, { identifier });
  }
}

export class WarehouseValidationError extends WarehouseError {
  constructor(message: string, field?: string) {
    super(`Warehouse validation failed: ${message}`, { field });
  }
}

export class WarehouseOperationError extends WarehouseError {
  constructor(operation: string, warehouseName: string, reason: string) {
    super(`Failed to ${operation} warehouse '${warehouseName}': ${reason}`, {
      operation,
      warehouseName,
      reason,
    });
  }
}
