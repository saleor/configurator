import { describe, it, expect, vi, beforeEach } from "vitest";
import { WarehouseService } from "./warehouse-service";
import type { WarehouseOperations, Warehouse, WarehouseCreateInput } from "./repository";

describe("WarehouseService", () => {
  let service: WarehouseService;
  let mockRepository: WarehouseOperations;

  beforeEach(() => {
    mockRepository = {
      createWarehouse: vi.fn(),
      updateWarehouse: vi.fn(),
      getWarehouseBySlug: vi.fn(),
    };
    service = new WarehouseService(mockRepository);
  });

  describe("upsertWarehouses", () => {
    it("should create warehouse when it doesn't exist", async () => {
      // Arrange
      const warehouseInput = {
        name: "Main Warehouse",
        slug: "main-warehouse",
        email: "warehouse@example.com",
        address: {
          streetAddress1: "123 Warehouse St",
          city: "New York",
          postalCode: "10001",
          country: "US" as const,
        },
      };

      const createdWarehouse: Warehouse = {
        id: "1",
        name: "Main Warehouse",
        slug: "main-warehouse",
        email: "warehouse@example.com",
        address: {
          streetAddress1: "123 Warehouse St",
          streetAddress2: "",
          city: "New York",
          cityArea: "",
          postalCode: "10001",
          country: { code: "US" },
          countryArea: "",
          phone: "",
        },
      };

      vi.mocked(mockRepository.getWarehouseBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createWarehouse).mockResolvedValue(createdWarehouse);

      // Act
      await service.upsertWarehouses([warehouseInput]);

      // Assert
      expect(mockRepository.getWarehouseBySlug).toHaveBeenCalledWith("main-warehouse");
      expect(mockRepository.createWarehouse).toHaveBeenCalledWith({
        name: "Main Warehouse",
        slug: "main-warehouse",
        email: "warehouse@example.com",
        address: {
          streetAddress1: "123 Warehouse St",
          streetAddress2: "",
          city: "New York",
          cityArea: "",
          postalCode: "10001",
          country: "US",
          countryArea: "",
          phone: "",
        },
      });
      expect(mockRepository.updateWarehouse).not.toHaveBeenCalled();
    });

    it("should update warehouse when it exists", async () => {
      // Arrange
      const warehouseInput = {
        name: "Updated Warehouse",
        slug: "main-warehouse",
        email: "updated@example.com",
        address: {
          streetAddress1: "456 New St",
          streetAddress2: "Suite 100",
          city: "Los Angeles",
          cityArea: "Downtown",
          postalCode: "90001",
          country: "US" as const,
          countryArea: "CA",
          phone: "+1234567890",
        },
      };

      const existingWarehouse: Warehouse = {
        id: "1",
        name: "Main Warehouse",
        slug: "main-warehouse",
        email: "warehouse@example.com",
        address: {
          streetAddress1: "123 Warehouse St",
          streetAddress2: "",
          city: "New York",
          cityArea: "",
          postalCode: "10001",
          country: { code: "US" },
          countryArea: "",
          phone: "",
        },
      };

      vi.mocked(mockRepository.getWarehouseBySlug).mockResolvedValue(existingWarehouse);
      vi.mocked(mockRepository.updateWarehouse).mockResolvedValue({
        ...existingWarehouse,
        name: "Updated Warehouse",
        email: "updated@example.com",
      });

      // Act
      await service.upsertWarehouses([warehouseInput]);

      // Assert
      expect(mockRepository.getWarehouseBySlug).toHaveBeenCalledWith("main-warehouse");
      expect(mockRepository.updateWarehouse).toHaveBeenCalledWith("1", {
        name: "Updated Warehouse",
        email: "updated@example.com",
        address: {
          streetAddress1: "456 New St",
          streetAddress2: "Suite 100",
          city: "Los Angeles",
          cityArea: "Downtown",
          postalCode: "90001",
          country: "US",
          countryArea: "CA",
          phone: "+1234567890",
        },
      });
      expect(mockRepository.createWarehouse).not.toHaveBeenCalled();
    });

    it("should handle multiple warehouses", async () => {
      // Arrange
      const warehouses = [
        {
          name: "Warehouse 1",
          slug: "warehouse-1",
          address: {
            streetAddress1: "123 St",
            city: "City 1",
            postalCode: "10001",
            country: "US" as const,
          },
        },
        {
          name: "Warehouse 2",
          slug: "warehouse-2",
          address: {
            streetAddress1: "456 St",
            city: "City 2",
            postalCode: "20002",
            country: "GB" as const,
          },
        },
      ];

      vi.mocked(mockRepository.getWarehouseBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createWarehouse).mockResolvedValue({} as Warehouse);

      // Act
      await service.upsertWarehouses(warehouses);

      // Assert
      expect(mockRepository.getWarehouseBySlug).toHaveBeenCalledTimes(2);
      expect(mockRepository.createWarehouse).toHaveBeenCalledTimes(2);
    });
  });
}); 