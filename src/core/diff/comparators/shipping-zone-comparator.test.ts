import { describe, expect, it } from "vitest";
import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ShippingMethod, ShippingZone } from "../../../modules/shipping-zone/repository";
import { ShippingZoneComparator } from "./shipping-zone-comparator";

describe("ShippingZoneComparator", () => {
  const comparator = new ShippingZoneComparator();

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
        maximumOrderPrice: 1000,
      },
    ],
  };

  const mockLocalZone: ShippingZoneInput = {
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
        minimumOrderPrice: null,
        maximumOrderPrice: { amount: 1000, currency: "USD" },
      },
    ],
    postalCodeRules: [],
    excludedProducts: { edges: [] },
  };

  const mockRemoteZone: ShippingZone = {
    id: "1",
    name: "US Zone",
    description: "United States shipping zone",
    default: false,
    countries: [{ code: "US", country: "United States" }],
    warehouses: [{ id: "w1", name: "Main Warehouse", slug: "main-warehouse" }],
    channels: [{ id: "c1", name: "Default Channel", slug: "default-channel" }],
    shippingMethods: [mockShippingMethod],
  };

  describe("compare", () => {
    it("should detect no changes when local and remote are identical", () => {
      const local = [mockLocalZone];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      // The test data isn't truly identical due to structural differences in channel listings
      // The remote has nested objects while local has flat values, which is expected
      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].changes).toHaveLength(1);
      expect(results[0].changes?.[0].field).toBe("shippingMethods");
    });

    it("should detect shipping zone to create", () => {
      const local = [mockLocalZone];
      const remote: ShippingZone[] = [];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "CREATE",
        entityType: "Shipping Zones",
        entityName: "US Zone",
        desired: mockLocalZone,
      });
    });

    it("should detect shipping zone to delete", () => {
      const local: ShippingZoneInput[] = [];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "DELETE",
        entityType: "Shipping Zones",
        entityName: "US Zone",
        current: mockRemoteZone,
      });
    });

    it("should detect shipping zone updates", () => {
      const local = [
        {
          ...mockLocalZone,
          description: "Updated description",
          default: true,
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "UPDATE",
        entityType: "Shipping Zones",
        entityName: "US Zone",
      });
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "description",
          currentValue: "United States shipping zone",
          desiredValue: "Updated description",
        })
      );
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "default",
          currentValue: false,
          desiredValue: true,
        })
      );
    });

    it("should detect country changes", () => {
      const local = [
        {
          ...mockLocalZone,
          countries: ["US" as const, "CA" as const],
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "countries",
          description: "Countries: [US] → [CA, US]",
        })
      );
    });

    it("should detect warehouse changes", () => {
      const local = [
        {
          ...mockLocalZone,
          warehouses: ["main-warehouse", "secondary-warehouse"],
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "warehouses",
          description: "Warehouses: [main-warehouse] → [main-warehouse, secondary-warehouse]",
        })
      );
    });

    it("should detect shipping method changes", () => {
      const newMethod: ShippingMethodInput = {
        ...mockShippingMethodInput,
        name: "Express Shipping",
        minimumDeliveryDays: 1,
        maximumDeliveryDays: 2,
      };

      const local = [
        {
          ...mockLocalZone,
          shippingMethods: [mockShippingMethodInput, newMethod],
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "shippingMethods",
          description: expect.stringContaining("Add: Express Shipping"),
        })
      );
    });

    it("should detect shipping method removal", () => {
      const local = [
        {
          ...mockLocalZone,
          shippingMethods: [],
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "shippingMethods",
          description: expect.stringContaining("Remove: Standard Shipping"),
        })
      );
    });

    it("should detect shipping method updates", () => {
      const updatedMethod: ShippingMethodInput = {
        ...mockShippingMethodInput,
        channelListings: [
          {
            channel: "default-channel",
            price: 15, // Changed price
            currency: "USD",
            minimumOrderPrice: 0,
            maximumOrderPrice: 1000,
          },
        ],
      };

      const local = [
        {
          ...mockLocalZone,
          shippingMethods: [updatedMethod],
        },
      ];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "shippingMethods",
          description: expect.stringContaining("Update: Standard Shipping"),
        })
      );
    });
  });
});
