import { describe, expect, it } from "vitest";
import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ShippingMethod, ShippingZone } from "../../../modules/shipping-zone/repository";
import { shippingZoneComparator } from "./shipping-zone-comparator";

describe("ShippingZoneComparator", () => {
  const comparator = shippingZoneComparator;

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
    metadata: [],
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
    metadata: [],
    name: "US Zone",
    description: "United States shipping zone",
    default: false,
    countries: [{ code: "US", country: "United States" }],
    warehouses: [{ id: "w1", name: "Main Warehouse", slug: "main-warehouse" }],
    channels: [{ id: "c1", name: "Default Channel", slug: "default-channel" }],
    shippingMethods: [mockShippingMethod],
  };

  describe("metadata", () => {
    it("compares zone and shipping method metadata by listed key", () => {
      const local = [
        {
          ...mockLocalZone,
          metadata: { region: "eu" },
          shippingMethods: [{ ...mockShippingMethodInput, metadata: { carrier: "dhl" } }],
        },
      ];
      const remote = [
        {
          ...mockRemoteZone,
          metadata: { region: "eu", "erp.apiUrl": "https://erp.dev" },
          shippingMethods: [{ ...mockShippingMethod, metadata: { carrier: "ups" } }],
        } as unknown as ShippingZone,
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toEqual([
        expect.objectContaining({
          field: "shippingMethods.Standard Shipping.metadata.carrier",
          currentValue: "ups",
          desiredValue: "dhl",
        }),
      ]);
    });
  });

  describe("compare", () => {
    it("should detect no changes when local and remote are identical", () => {
      const local = [mockLocalZone];
      const remote = [mockRemoteZone];

      const results = comparator.compare(local, remote);

      // The comparator now correctly handles structural differences in channel listings
      // and recognizes that local flat values and remote nested objects are equivalent
      expect(results).toHaveLength(0);
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
      expect(results[0].changes).toEqual([
        expect.objectContaining({ path: ["countries", "CA"], kind: "added", desiredValue: "CA" }),
      ]);
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
      expect(results[0].changes).toEqual([
        expect.objectContaining({
          path: ["warehouses", "secondary-warehouse"],
          kind: "added",
          desiredValue: "secondary-warehouse",
        }),
      ]);
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
        expect.objectContaining({ path: ["shippingMethods", "Express Shipping"], kind: "added" })
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
        expect.objectContaining({ path: ["shippingMethods", "Standard Shipping"], kind: "removed" })
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
      expect(results[0].changes).toEqual([
        expect.objectContaining({
          path: [
            "shippingMethods",
            "Standard Shipping",
            "channelListings",
            "default-channel",
            "price",
          ],
          currentValue: 10,
          desiredValue: 15,
        }),
      ]);
    });
  });

  // Note: getEntityName is protected and tested implicitly through other methods

  describe("validateUniqueIdentifiers", () => {
    it("should validate unique names", () => {
      const duplicateZone: ShippingZoneInput = { ...mockLocalZone, countries: ["CA"] };
      const zones = [mockLocalZone, duplicateZone];

      expect(() => comparator.compare(zones, [])).toThrow(
        "Duplicate entity identifiers found in Shipping Zones: US Zone"
      );
    });
  });

  describe("duplicates in Saleor", () => {
    it("uses the first zone with a name", () => {
      const caZone: ShippingZoneInput = { ...mockLocalZone, countries: ["CA"] };
      const euZone: ShippingZoneInput = {
        ...mockLocalZone,
        name: "EU Zone",
        countries: ["DE", "FR"],
      };
      const zones = [mockLocalZone, caZone, euZone];

      const results = comparator.compare([], zones);

      expect(results.map((result) => result.entityName)).toEqual(["US Zone", "EU Zone"]);
    });
  });
});
