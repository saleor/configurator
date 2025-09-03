import { describe, expect, it, vi } from "vitest";
import type { WarehouseInput } from "../config/schema/schema";
import { WarehouseOperationError, WarehouseValidationError } from "./errors";
import type { Warehouse } from "./repository";
import { WarehouseService } from "./warehouse-service";

describe("WarehouseService", () => {
  const mockWarehouseInput: WarehouseInput = {
    name: "Main Warehouse",
    slug: "main-warehouse",
    email: "warehouse@example.com",
    isPrivate: false,
    clickAndCollectOption: "DISABLED",
    address: {
      streetAddress1: "123 Main St",
      streetAddress2: "Suite 100",
      city: "New York",
      cityArea: "Manhattan",
      postalCode: "10001",
      country: "US",
      countryArea: "NY",
      companyName: "Acme Corp",
      phone: "+1234567890",
    },
    shippingZones: ["zone-1", "zone-2"],
  };

  const mockWarehouse: Warehouse = {
    id: "1",
    name: "Main Warehouse",
    slug: "main-warehouse",
    email: "warehouse@example.com",
    isPrivate: false,
    clickAndCollectOption: "DISABLED",
    address: {
      streetAddress1: "123 Main St",
      streetAddress2: "Suite 100",
      city: "New York",
      cityArea: "Manhattan",
      postalCode: "10001",
      country: { code: "US" },
      countryArea: "NY",
      companyName: "Acme Corp",
      phone: "+1234567890",
    },
    shippingZones: {
      edges: [{ node: { id: "z1", name: "zone-1" } }, { node: { id: "z2", name: "zone-2" } }],
    },
  };

  describe("validateWarehouseInput", () => {
    it("should throw error when warehouse slug is missing", async () => {
      const invalidInput = { ...mockWarehouseInput, slug: "" };
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await expect(service.createWarehouse(invalidInput)).rejects.toThrow(WarehouseValidationError);
    });

    it("should throw error when warehouse name is missing", async () => {
      const invalidInput = { ...mockWarehouseInput, name: "" };
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await expect(service.createWarehouse(invalidInput)).rejects.toThrow(WarehouseValidationError);
    });

    it("should accept warehouse without email", async () => {
      const inputWithoutEmail = { ...mockWarehouseInput, email: undefined };
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn().mockResolvedValue({ ...mockWarehouse, email: "" }),
        updateWarehouse: vi.fn().mockResolvedValue({ ...mockWarehouse, email: "" }),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      const result = await service.createWarehouse(inputWithoutEmail);
      expect(result).toBeDefined();
      expect(mockOperations.createWarehouse).toHaveBeenCalled();
    });

    it("should accept warehouse with empty email string", async () => {
      const inputWithEmptyEmail = { ...mockWarehouseInput, email: "" };
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn().mockResolvedValue({ ...mockWarehouse, email: "" }),
        updateWarehouse: vi.fn().mockResolvedValue({ ...mockWarehouse, email: "" }),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      const result = await service.createWarehouse(inputWithEmptyEmail);
      expect(result).toBeDefined();
      expect(mockOperations.createWarehouse).toHaveBeenCalled();
    });
  });

  describe("getOrCreateWarehouse", () => {
    it("should not create a warehouse that already exists", async () => {
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([mockWarehouse]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn().mockResolvedValue(mockWarehouse),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      const result = await service.getOrCreateWarehouse(mockWarehouseInput);

      expect(mockOperations.createWarehouse).not.toHaveBeenCalled();
      expect(mockOperations.updateWarehouse).toHaveBeenCalled();
      expect(result).toEqual(mockWarehouse);
    });

    it("should create a new warehouse when it doesn't exist", async () => {
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn().mockResolvedValue(mockWarehouse),
        updateWarehouse: vi.fn().mockResolvedValue(mockWarehouse),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      const result = await service.getOrCreateWarehouse(mockWarehouseInput);

      expect(mockOperations.createWarehouse).toHaveBeenCalled();
      // updateWarehouse may be called due to two-step creation
      expect(result).toEqual(mockWarehouse);
    });
  });

  describe("bootstrapWarehouses", () => {
    it("should validate unique slugs", async () => {
      const duplicateWarehouses = [
        mockWarehouseInput,
        { ...mockWarehouseInput, name: "Another Warehouse" },
      ];

      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await expect(service.bootstrapWarehouses(duplicateWarehouses)).rejects.toThrow(
        WarehouseValidationError
      );
    });

    it("should process multiple warehouses successfully", async () => {
      const warehouses = [
        mockWarehouseInput,
        { ...mockWarehouseInput, slug: "secondary-warehouse", name: "Secondary Warehouse" },
      ];

      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn().mockResolvedValue(mockWarehouse),
        updateWarehouse: vi.fn().mockResolvedValue(mockWarehouse),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      const results = await service.bootstrapWarehouses(warehouses);

      expect(mockOperations.createWarehouse).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("syncWarehouseShippingZones", () => {
    it("should assign warehouse to shipping zones", async () => {
      const mockOperations = {
        getWarehouses: vi.fn(),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await service.syncWarehouseShippingZones("warehouse-1", ["zone-1", "zone-2"], []);

      expect(mockOperations.assignShippingZones).toHaveBeenCalledWith("warehouse-1", [
        "zone-1",
        "zone-2",
      ]);
    });

    it("should handle empty shipping zones", async () => {
      const mockOperations = {
        getWarehouses: vi.fn(),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await service.syncWarehouseShippingZones("warehouse-1", [], []);

      expect(mockOperations.assignShippingZones).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw WarehouseOperationError on create failure", async () => {
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn().mockRejectedValue(new Error("API Error")),
        updateWarehouse: vi.fn(),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await expect(service.createWarehouse(mockWarehouseInput)).rejects.toThrow(
        WarehouseOperationError
      );
    });

    it("should throw WarehouseOperationError on update failure", async () => {
      const mockOperations = {
        getWarehouses: vi.fn().mockResolvedValue([]),
        getWarehouse: vi.fn(),
        createWarehouse: vi.fn(),
        updateWarehouse: vi.fn().mockRejectedValue(new Error("API Error")),
        assignShippingZones: vi.fn(),
        unassignShippingZones: vi.fn(),
      };

      const service = new WarehouseService(mockOperations);

      await expect(service.updateWarehouse("1", mockWarehouseInput)).rejects.toThrow(
        WarehouseOperationError
      );
    });
  });
});
