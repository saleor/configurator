import { describe, expect, it, vi } from "vitest";
import type { ChannelOperations } from "../channel/repository";
import type { ShippingMethodInput, ShippingZoneInput } from "../config/schema/schema";
import type { WarehouseOperations } from "../warehouse/repository";
import {
  ShippingMethodValidationError,
  ShippingZoneOperationError,
  ShippingZoneValidationError,
} from "./errors";
import type { ShippingMethod, ShippingZone } from "./repository";
import { ShippingZoneService } from "./shipping-zone-service";

// Test class to access protected methods
class TestShippingZoneService extends ShippingZoneService {
  async testSyncShippingMethods(
    shippingZoneId: string,
    desiredMethods: ShippingMethodInput[],
    currentMethods: ShippingMethod[]
  ): Promise<void> {
    return this.syncShippingMethods(shippingZoneId, desiredMethods, currentMethods);
  }
}

describe("ShippingZoneService", () => {
  const createMockWarehouseOperations = (): WarehouseOperations => ({
    getWarehouses: vi
      .fn()
      .mockResolvedValue([{ id: "w1", name: "Main Warehouse", slug: "main-warehouse" }]),
    getWarehouse: vi.fn(),
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    assignShippingZones: vi.fn(),
    unassignShippingZones: vi.fn(),
  });

  const createMockChannelOperations = (): ChannelOperations => ({
    getChannels: vi
      .fn()
      .mockResolvedValue([{ id: "c1", name: "Default Channel", slug: "default-channel" }]),
    getChannelBySlug: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
  });

  const mockShippingMethodInput: ShippingMethodInput = {
    name: "Standard Shipping",
    description: "Standard delivery",
    type: "PRICE",
    minimumDeliveryDays: 3,
    maximumDeliveryDays: 5,
    channelListings: [
      {
        channel: "default-channel",
        price: 10,
        currency: "USD",
        minimumOrderPrice: 0,
        maximumOrderPrice: 1000,
      },
    ],
  };

  const mockShippingZoneInput: ShippingZoneInput = {
    name: "US Zone",
    description: "United States shipping zone",
    default: false,
    countries: ["US" as const],
    warehouses: ["main-warehouse"],
    channels: ["default-channel"],
    shippingMethods: [mockShippingMethodInput],
  };

  const mockShippingMethod: ShippingMethod = {
    id: "m1",
    name: "Standard Shipping",
    description: "Standard delivery",
    type: "PRICE",
    minimumDeliveryDays: 3,
    maximumDeliveryDays: 5,
    maximumOrderWeight: null,
    minimumOrderWeight: null,
    channelListings: [
      {
        channel: { slug: "default-channel" },
        price: { amount: 10, currency: "USD" },
        minimumOrderPrice: { amount: 0, currency: "USD" },
        maximumOrderPrice: { amount: 1000, currency: "USD" },
      },
    ],
    postalCodeRules: [],
    excludedProducts: { edges: [] },
  };

  const mockShippingZone: ShippingZone = {
    id: "1",
    name: "US Zone",
    description: "United States shipping zone",
    default: false,
    countries: [{ code: "US", country: "United States" }],
    warehouses: [{ id: "w1", name: "Main Warehouse", slug: "main-warehouse" }],
    channels: [{ id: "c1", name: "Default Channel", slug: "default-channel" }],
    shippingMethods: [mockShippingMethod],
  };

  describe("validateShippingZoneInput", () => {
    it("should throw error when shipping zone name is missing", async () => {
      const invalidInput = { ...mockShippingZoneInput, name: "" };
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.createShippingZone(invalidInput)).rejects.toThrow(
        ShippingZoneValidationError
      );
    });

    it("should throw error when no countries are provided", async () => {
      const invalidInput = { ...mockShippingZoneInput, countries: [] };
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.createShippingZone(invalidInput)).rejects.toThrow(
        ShippingZoneValidationError
      );
    });
  });

  describe("validateShippingMethodInput", () => {
    it("should throw error when shipping method name is missing", async () => {
      const invalidMethod: ShippingMethodInput = { ...mockShippingMethodInput, name: "" };
      const invalidInput = { ...mockShippingZoneInput, shippingMethods: [invalidMethod] };

      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn().mockResolvedValue({ ...mockShippingZone, shippingMethods: [] }),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.createShippingZone(invalidInput)).rejects.toThrow(
        ShippingMethodValidationError
      );
    });

    it("should throw error when channel listing has invalid price", async () => {
      const invalidMethod: ShippingMethodInput = {
        ...mockShippingMethodInput,
        channelListings: [
          {
            channel: "default-channel",
            price: -10,
            currency: "USD",
          },
        ],
      };
      const invalidInput = { ...mockShippingZoneInput, shippingMethods: [invalidMethod] };

      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn().mockResolvedValue({ ...mockShippingZone, shippingMethods: [] }),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.createShippingZone(invalidInput)).rejects.toThrow(
        ShippingMethodValidationError
      );
    });
  });

  describe("getOrCreateShippingZone", () => {
    it("should not create a shipping zone that already exists", async () => {
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([mockShippingZone]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn().mockResolvedValue(mockShippingZone),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      const result = await service.getOrCreateShippingZone(mockShippingZoneInput);

      expect(mockOperations.createShippingZone).not.toHaveBeenCalled();
      expect(mockOperations.updateShippingZone).toHaveBeenCalled();
      expect(result).toEqual(mockShippingZone);
    });

    it("should create a new shipping zone when it doesn't exist", async () => {
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn().mockResolvedValue(mockShippingZone),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn().mockResolvedValue(mockShippingMethod),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      const result = await service.getOrCreateShippingZone(mockShippingZoneInput);

      expect(mockOperations.createShippingZone).toHaveBeenCalled();
      expect(mockOperations.updateShippingZone).not.toHaveBeenCalled();
      expect(result).toEqual(mockShippingZone);
    });
  });

  describe("syncShippingMethods", () => {
    it("should create new shipping methods", async () => {
      const mockOperations = {
        getShippingZones: vi.fn(),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn().mockResolvedValue(mockShippingMethod),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new TestShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await service.testSyncShippingMethods("zone-1", [mockShippingMethodInput], []);

      expect(mockOperations.createShippingMethod).toHaveBeenCalled();
      expect(mockOperations.deleteShippingMethod).not.toHaveBeenCalled();
    });

    it("should update existing shipping methods", async () => {
      const mockOperations = {
        getShippingZones: vi.fn(),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn().mockResolvedValue(mockShippingMethod),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new TestShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await service.testSyncShippingMethods(
        "zone-1",
        [mockShippingMethodInput],
        [mockShippingMethod]
      );

      expect(mockOperations.updateShippingMethod).toHaveBeenCalled();
      expect(mockOperations.createShippingMethod).not.toHaveBeenCalled();
    });

    it("should delete removed shipping methods", async () => {
      const mockOperations = {
        getShippingZones: vi.fn(),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new TestShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await service.testSyncShippingMethods("zone-1", [], [mockShippingMethod]);

      expect(mockOperations.deleteShippingMethod).toHaveBeenCalledWith(mockShippingMethod.id);
    });
  });

  describe("bootstrapShippingZones", () => {
    it("should validate unique names", async () => {
      const duplicateZones = [
        mockShippingZoneInput,
        { ...mockShippingZoneInput, countries: ["CA" as const] },
      ];

      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.bootstrapShippingZones(duplicateZones)).rejects.toThrow(
        ShippingZoneValidationError
      );
    });

    it("should process multiple zones successfully", async () => {
      const zones = [
        mockShippingZoneInput,
        { ...mockShippingZoneInput, name: "EU Zone", countries: ["FR" as const, "DE" as const, "IT" as const] },
      ];

      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn().mockResolvedValue(mockShippingZone),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn().mockResolvedValue(mockShippingMethod),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      const results = await service.bootstrapShippingZones(zones);

      expect(mockOperations.createShippingZone).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("should throw ShippingZoneOperationError on create failure", async () => {
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn().mockRejectedValue(new Error("API Error")),
        updateShippingZone: vi.fn(),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.createShippingZone(mockShippingZoneInput)).rejects.toThrow(
        ShippingZoneOperationError
      );
    });

    it("should throw ShippingZoneOperationError on update failure", async () => {
      const mockOperations = {
        getShippingZones: vi.fn().mockResolvedValue([]),
        getShippingZone: vi.fn(),
        createShippingZone: vi.fn(),
        updateShippingZone: vi.fn().mockRejectedValue(new Error("API Error")),
        createShippingMethod: vi.fn(),
        updateShippingMethod: vi.fn(),
        deleteShippingMethod: vi.fn(),
        updateShippingMethodChannelListing: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        createMockWarehouseOperations(),
        createMockChannelOperations()
      );

      await expect(service.updateShippingZone("1", mockShippingZoneInput)).rejects.toThrow(
        ShippingZoneOperationError
      );
    });
  });
});
