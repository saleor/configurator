import { describe, expect, it } from "vitest";
import type { ShippingMethodInput, ShippingZoneInput } from "../../../modules/config/schema/schema";
import type { ShippingMethod, ShippingZone } from "../../../modules/shipping-zone/repository";
import { ShippingZoneComparator } from "./shipping-zone-comparator";

// Test subclass to expose protected methods for testing
class TestableShippingZoneComparator extends ShippingZoneComparator {
  public testValidateUniqueIdentifiers(entities: readonly ShippingZoneInput[]): void {
    this.validateUniqueIdentifiers(entities as readonly (ShippingZoneInput | ShippingZone)[]);
  }

  public testDeduplicateEntities(
    entities: readonly ShippingZoneInput[]
  ): readonly (ShippingZoneInput | ShippingZone)[] {
    return this.deduplicateEntities(entities as readonly (ShippingZoneInput | ShippingZone)[]);
  }
}

describe("ShippingZoneComparator", () => {
  const comparator = new TestableShippingZoneComparator();

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
    countries: ["US"],
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
    postalCodeRules: null,
    excludedProducts: null,
    channelListings: [
      {
        channel: { slug: "default-channel" },
        price: { amount: 10, currency: "USD" },
        minimumOrderPrice: null,
        maximumOrderPrice: { amount: 1000, currency: "USD" },
      },
    ],
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

      // With improved type handling, the comparator now correctly identifies
      // equivalent structures and normalizes them properly for comparison
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
      const zoneWithMultipleCountries: ShippingZoneInput = {
        ...mockLocalZone,
        countries: ["US", "CA"],
      };
      const local = [zoneWithMultipleCountries];
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

  // Note: getEntityName is protected and tested implicitly through other methods

  describe("validateUniqueIdentifiers", () => {
    it("should validate unique names", () => {
      const duplicateZone: ShippingZoneInput = { ...mockLocalZone, countries: ["CA"] };
      const zones = [mockLocalZone, duplicateZone];

      expect(() => comparator.testValidateUniqueIdentifiers(zones)).toThrow(
        "Duplicate entity identifiers found in Shipping Zones: US Zone"
      );
    });
  });

  describe("deduplicateEntities", () => {
    it("should deduplicate by name", () => {
      const caZone: ShippingZoneInput = { ...mockLocalZone, countries: ["CA"] };
      const euZone: ShippingZoneInput = {
        ...mockLocalZone,
        name: "EU Zone",
        countries: ["DE", "FR"],
      };
      const zones = [mockLocalZone, caZone, euZone];

      const deduplicated = comparator.testDeduplicateEntities(zones);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0]?.name).toBe("US Zone");
      expect(deduplicated[1]?.name).toBe("EU Zone");
    });
  });
});
