import { describe, expect, it, vi } from "vitest";
import type { ChannelOperations } from "../channel/repository";
import type { ShippingZoneInput } from "../config/schema/schema";
import type { WarehouseOperations } from "../warehouse/repository";
import { ShippingZoneValidationError } from "./errors";
import { ShippingZoneService } from "./shipping-zone-service";

describe("ShippingZoneService - Slug Resolution", () => {
  const createMockShippingZoneOperations = () => ({
    getShippingZones: vi.fn().mockResolvedValue([]),
    getShippingZone: vi.fn(),
    createShippingZone: vi.fn().mockResolvedValue({
      id: "sz1",
      name: "Test Zone",
      default: false,
      countries: [{ code: "US", country: "United States" }],
      warehouses: [],
      channels: [],
      shippingMethods: [],
    }),
    updateShippingZone: vi.fn(),
    createShippingMethod: vi.fn().mockResolvedValue({ id: "sm1" }),
    updateShippingMethod: vi.fn(),
    deleteShippingMethod: vi.fn(),
    updateShippingMethodChannelListing: vi.fn(),
  });

  const createMockWarehouseOperations = (): WarehouseOperations => ({
    getWarehouses: vi.fn().mockResolvedValue([
      { id: "w1", name: "Europe Warehouse", slug: "europe" },
      { id: "w2", name: "Asia Warehouse", slug: "asia" },
      { id: "w3", name: "Americas Warehouse", slug: "americas" },
    ]),
    getWarehouse: vi.fn(),
    createWarehouse: vi.fn(),
    updateWarehouse: vi.fn(),
    assignShippingZones: vi.fn(),
    unassignShippingZones: vi.fn(),
  });

  const createMockChannelOperations = (): ChannelOperations => ({
    getChannels: vi.fn().mockResolvedValue([
      { id: "c1", name: "Default Channel", slug: "default-channel" },
      { id: "c2", name: "EU Channel", slug: "eu-channel" },
      { id: "c3", name: "US B2B", slug: "us-b2b" },
    ]),
    getChannelBySlug: vi.fn(),
    createChannel: vi.fn(),
    updateChannel: vi.fn(),
  });

  describe("warehouse slug resolution", () => {
    it("should resolve warehouse slugs to IDs when creating shipping zone", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Test Zone",
        default: false,
        countries: ["US" as const],
        warehouses: ["europe", "asia"],
        channels: ["default-channel"],
      };

      await service.createShippingZone(input);

      expect(mockOperations.createShippingZone).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Zone",
          countries: ["US"],
          addWarehouses: ["w1", "w2"], // Resolved IDs
          addChannels: ["c1"], // Resolved ID
        })
      );
    });

    it("should throw error when warehouse slug not found", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Test Zone",
        default: false,
        countries: ["US" as const],
        warehouses: ["non-existent-warehouse"],
      };

      await expect(service.createShippingZone(input)).rejects.toThrow(ShippingZoneValidationError);
      await expect(service.createShippingZone(input)).rejects.toThrow(
        "Warehouse with slug 'non-existent-warehouse' not found"
      );
    });
  });

  describe("channel slug resolution", () => {
    it("should resolve channel slugs to IDs for shipping methods", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Test Zone",
        default: false,
        countries: ["US" as const],
        channels: ["default-channel", "eu-channel"],
        shippingMethods: [
          {
            name: "Standard Shipping",
            type: "PRICE",
            channelListings: [
              {
                channel: "default-channel",
                price: 10,
                currency: "USD",
              },
              {
                channel: "eu-channel",
                price: 15,
                currency: "EUR",
              },
            ],
          },
        ],
      };

      await service.createShippingZone(input);

      expect(mockOperations.updateShippingMethodChannelListing).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          addChannels: expect.arrayContaining([
            expect.objectContaining({
              channelId: "c1", // Resolved from "default-channel"
              price: "10",
            }),
            expect.objectContaining({
              channelId: "c2", // Resolved from "eu-channel"
              price: "15",
            }),
          ]),
        })
      );
    });

    it("should throw error when channel slug not found", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Test Zone",
        default: false,
        countries: ["US" as const],
        channels: ["non-existent-channel"],
      };

      await expect(service.createShippingZone(input)).rejects.toThrow(ShippingZoneValidationError);
      await expect(service.createShippingZone(input)).rejects.toThrow(
        "Channel with slug 'non-existent-channel' not found"
      );
    });

    it("should handle null channels response", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations: ChannelOperations = {
        getChannels: vi.fn().mockResolvedValue(null),
        getChannelBySlug: vi.fn(),
        createChannel: vi.fn(),
        updateChannel: vi.fn(),
      };

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Test Zone",
        default: false,
        countries: ["US" as const],
        channels: ["default-channel"],
      };

      await expect(service.createShippingZone(input)).rejects.toThrow("Failed to fetch channels");
    });
  });

  describe("update operations with slug resolution", () => {
    it("should resolve slugs when updating shipping zone", async () => {
      const mockOperations = createMockShippingZoneOperations();
      mockOperations.updateShippingZone.mockResolvedValue({
        id: "sz1",
        name: "Updated Zone",
        default: false,
        countries: [{ code: "US", country: "United States" }],
        warehouses: [],
        channels: [],
        shippingMethods: [],
      });

      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Updated Zone",
        default: false,
        countries: ["US" as const, "CA" as const],
        warehouses: ["americas"],
        channels: ["us-b2b"],
      };

      await service.updateShippingZone("sz1", input);

      expect(mockOperations.updateShippingZone).toHaveBeenCalledWith(
        "sz1",
        expect.objectContaining({
          name: "Updated Zone",
          countries: ["US", "CA"],
          addWarehouses: ["w3"], // Resolved from "americas"
          addChannels: ["c3"], // Resolved from "us-b2b"
        })
      );
    });
  });

  describe("performance optimizations", () => {
    it("should batch resolve multiple warehouse slugs", async () => {
      const mockOperations = createMockShippingZoneOperations();
      const warehouseOperations = createMockWarehouseOperations();
      const channelOperations = createMockChannelOperations();

      const service = new ShippingZoneService(
        mockOperations,
        warehouseOperations,
        channelOperations
      );

      const input: ShippingZoneInput = {
        name: "Multi-Warehouse Zone",
        default: false,
        countries: ["US" as const],
        warehouses: ["europe", "asia", "americas"],
      };

      await service.createShippingZone(input);

      // Should only call getWarehouses once for all slugs due to caching
      expect(warehouseOperations.getWarehouses).toHaveBeenCalledTimes(1); // Called once, cached for subsequent calls
    });
  });
});
