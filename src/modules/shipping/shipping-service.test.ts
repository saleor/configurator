import { describe, it, expect, vi, beforeEach } from "vitest";
import { ShippingService } from "./shipping-service";
import type { ShippingRepository } from "./repository";
import type { ChannelService } from "../channel/channel-service";

const mockRepository = {
  getShippingZones: vi.fn(),
  createShippingZone: vi.fn(),
  updateShippingZone: vi.fn(),
  createShippingMethod: vi.fn(),
  updateShippingMethod: vi.fn(),
  assignChannelsToShippingZone: vi.fn(),
  createPostalCodeRule: vi.fn(),
} as unknown as ShippingRepository;

const mockChannelService = {
  getChannelsBySlug: vi.fn(),
} as unknown as ChannelService;

describe("ShippingService", () => {
  let service: ShippingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ShippingService(mockRepository, mockChannelService);
  });

  describe("upsertShippingZones", () => {
    it("should create new shipping zones when they don't exist", async () => {
      // Arrange
      const zones = [
        {
          name: "US Zone",
          description: "United States shipping zone",
          countries: ["US"],
          channels: ["default-channel"],
          shippingMethods: [
            {
              name: "Standard Shipping",
              type: "PRICE" as const,
              channelListings: [
                {
                  channelSlug: "default-channel",
                  price: 10,
                },
              ],
            },
          ],
        },
      ];

      vi.mocked(mockRepository.getShippingZones).mockResolvedValue([]);
      vi.mocked(mockRepository.createShippingZone).mockResolvedValue({
        id: "zone-1",
        name: "US Zone",
        description: "United States shipping zone",
        countries: [{ code: "US", country: "United States" }],
        channels: [],
        shippingMethods: [],
      });
      vi.mocked(mockChannelService.getChannelsBySlug).mockResolvedValue([
        { id: "channel-1", slug: "default-channel" },
      ]);
      vi.mocked(mockRepository.createShippingMethod).mockResolvedValue({
        id: "method-1",
        name: "Standard Shipping",
        type: "PRICE",
        description: undefined,
        channelListings: [],
      });

      // Act
      const result = await service.upsertShippingZones(zones);

      // Assert
      expect(mockRepository.getShippingZones).toHaveBeenCalledOnce();
      expect(mockRepository.createShippingZone).toHaveBeenCalledWith({
        name: "US Zone",
        description: "United States shipping zone",
        countries: ["US"],
      });
      expect(mockRepository.assignChannelsToShippingZone).toHaveBeenCalledWith(
        "zone-1",
        ["channel-1"]
      );
      expect(mockRepository.createShippingMethod).toHaveBeenCalledWith({
        shippingZone: "zone-1",
        name: "Standard Shipping",
        description: undefined,
        type: "PRICE",
        maximumOrderWeight: undefined,
        minimumOrderWeight: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("zone-1");
    });

    it("should update existing shipping zones", async () => {
      // Arrange
      const zones = [
        {
          name: "EU Zone",
          description: "European Union shipping zone",
          countries: ["DE", "FR", "IT"],
        },
      ];

      vi.mocked(mockRepository.getShippingZones).mockResolvedValue([
        {
          id: "zone-2",
          name: "EU Zone",
          description: "Old description",
          countries: [{ code: "DE", country: "Germany" }],
          channels: [],
          shippingMethods: [],
        },
      ]);
      vi.mocked(mockRepository.updateShippingZone).mockResolvedValue({
        id: "zone-2",
        name: "EU Zone",
        description: "European Union shipping zone",
        countries: [
          { code: "DE", country: "Germany" },
          { code: "FR", country: "France" },
          { code: "IT", country: "Italy" },
        ],
        channels: [],
        shippingMethods: [],
      });

      // Act
      const result = await service.upsertShippingZones(zones);

      // Assert
      expect(mockRepository.getShippingZones).toHaveBeenCalledOnce();
      expect(mockRepository.updateShippingZone).toHaveBeenCalledWith("zone-2", {
        name: "EU Zone",
        description: "European Union shipping zone",
        countries: ["DE", "FR", "IT"],
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("zone-2");
    });

    it("should handle shipping methods with postal code rules", async () => {
      // Arrange
      const zones = [
        {
          name: "Local Zone",
          countries: ["US"],
          shippingMethods: [
            {
              name: "Local Delivery",
              postalCodeRules: [
                {
                  start: "10001",
                  end: "10999",
                  inclusionType: "INCLUDE" as const,
                },
              ],
            },
          ],
        },
      ];

      vi.mocked(mockRepository.getShippingZones).mockResolvedValue([]);
      vi.mocked(mockRepository.createShippingZone).mockResolvedValue({
        id: "zone-3",
        name: "Local Zone",
        countries: [{ code: "US", country: "United States" }],
        channels: [],
        shippingMethods: [],
      });
      vi.mocked(mockRepository.createShippingMethod).mockResolvedValue({
        id: "method-2",
        name: "Local Delivery",
        type: "PRICE",
        description: undefined,
        channelListings: [],
      });

      // Act
      await service.upsertShippingZones(zones);

      // Assert
      expect(mockRepository.createPostalCodeRule).toHaveBeenCalledWith("method-2", {
        start: "10001",
        end: "10999",
        inclusionType: "INCLUDE",
      });
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      const zones = [{ name: "Error Zone", countries: ["US"] }];
      const error = new Error("GraphQL error");
      vi.mocked(mockRepository.getShippingZones).mockRejectedValue(error);

      // Act & Assert
      await expect(service.upsertShippingZones(zones)).rejects.toThrow(
        "GraphQL error"
      );
    });
  });
}); 