import { describe, expect, it } from "vitest";
import type { WarehouseInput } from "../../../modules/config/schema/schema";
import type { Warehouse } from "../../../modules/warehouse/repository";
import { WarehouseComparator } from "./warehouse-comparator";

// Test subclass to expose protected methods for testing
class TestableWarehouseComparator extends WarehouseComparator {
  public testValidateUniqueIdentifiers(entities: readonly WarehouseInput[]): void {
    this.validateUniqueIdentifiers(entities);
  }

  public testDeduplicateEntities(entities: readonly WarehouseInput[]): readonly WarehouseInput[] {
    return this.deduplicateEntities(entities) as readonly WarehouseInput[];
  }

  public testGetEntityName(entity: WarehouseInput | Warehouse): string {
    return this.getEntityName(entity);
  }
}

describe("WarehouseComparator", () => {
  const comparator = new TestableWarehouseComparator();

  const mockLocalWarehouse: WarehouseInput = {
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

  const mockRemoteWarehouse: Warehouse = {
    id: "1",
    name: "Main Warehouse",
    slug: "main-warehouse",
    email: "warehouse@example.com",
    isPrivate: false,
    companyName: "Acme Corp",
    clickAndCollectOption: "DISABLED",
    address: {
      streetAddress1: "123 Main St",
      streetAddress2: "Suite 100",
      city: "New York",
      cityArea: "Manhattan",
      postalCode: "10001",
      country: { code: "US", country: "United States" },
      countryArea: "NY",
      companyName: "Acme Corp",
      phone: "+1234567890",
    },
    shippingZones: {
      edges: [{ node: { id: "z1", name: "zone-1" } }, { node: { id: "z2", name: "zone-2" } }],
    },
  };

  describe("compare", () => {
    it("should detect no changes when local and remote are identical", () => {
      const local = [mockLocalWarehouse];
      const remote = [mockRemoteWarehouse];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(0);
    });

    it("should detect warehouse to create", () => {
      const local = [mockLocalWarehouse];
      const remote: Warehouse[] = [];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "CREATE",
        entityType: "Warehouses",
        entityName: "main-warehouse",
        desired: mockLocalWarehouse,
      });
    });

    it("should detect warehouse to delete", () => {
      const local: WarehouseInput[] = [];
      const remote = [mockRemoteWarehouse];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "DELETE",
        entityType: "Warehouses",
        entityName: "main-warehouse",
        current: mockRemoteWarehouse,
      });
    });

    it("should detect warehouse updates", () => {
      const local = [
        {
          ...mockLocalWarehouse,
          name: "Updated Warehouse Name",
          email: "newemail@example.com",
        },
      ];
      const remote = [mockRemoteWarehouse];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        operation: "UPDATE",
        entityType: "Warehouses",
        entityName: "main-warehouse",
      });
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "name",
          currentValue: "Main Warehouse",
          desiredValue: "Updated Warehouse Name",
        })
      );
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "email",
          currentValue: "warehouse@example.com",
          desiredValue: "newemail@example.com",
        })
      );
    });

    it("should detect address changes", () => {
      const local = [
        {
          ...mockLocalWarehouse,
          address: {
            ...mockLocalWarehouse.address,
            streetAddress1: "456 New St",
            city: "Los Angeles",
          },
        },
      ];
      const remote = [mockRemoteWarehouse];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "address.streetAddress1",
          currentValue: "123 Main St",
          desiredValue: "456 New St",
        })
      );
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "address.city",
          currentValue: "New York",
          desiredValue: "Los Angeles",
        })
      );
    });

    it("should handle city case normalization (lowercase local vs UPPERCASE remote)", () => {
      const local = [
        {
          ...mockLocalWarehouse,
          address: {
            ...mockLocalWarehouse.address,
            city: "new york", // lowercase
          },
        },
      ];
      const remote = [
        {
          ...mockRemoteWarehouse,
          address: {
            ...mockRemoteWarehouse.address,
            city: "NEW YORK", // UPPERCASE (Saleor normalizes)
          },
        },
      ];

      const results = comparator.compare(local, remote);

      // Should not show any changes due to case normalization
      if (results.length > 0) {
        const cityChange = results[0].changes?.find((c) => c.field === "address.city");
        expect(cityChange).toBeUndefined();
      }
    });

    it("should detect actual city changes beyond case differences", () => {
      const local = [
        {
          ...mockLocalWarehouse,
          address: {
            ...mockLocalWarehouse.address,
            city: "los angeles",
          },
        },
      ];
      const remote = [
        {
          ...mockRemoteWarehouse,
          address: {
            ...mockRemoteWarehouse.address,
            city: "NEW YORK", // Different city, not just case
          },
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      const cityChange = results[0].changes?.find((c) => c.field === "address.city");
      expect(cityChange).toBeDefined();
      expect(cityChange?.currentValue).toBe("NEW YORK");
      expect(cityChange?.desiredValue).toBe("los angeles");
    });

    it("should detect shipping zone changes", () => {
      const local = [
        {
          ...mockLocalWarehouse,
          shippingZones: ["zone-1", "zone-3"],
        },
      ];
      const remote = [mockRemoteWarehouse];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].changes).toContainEqual(
        expect.objectContaining({
          field: "shippingZones",
          description: "Shipping zones: [zone-1, zone-2] → [zone-1, zone-3]",
        })
      );
    });
  });

  describe("getEntityName", () => {
    it("should use slug as identifier", () => {
      expect(comparator.testGetEntityName(mockLocalWarehouse)).toBe("main-warehouse");
      expect(comparator.testGetEntityName(mockRemoteWarehouse)).toBe("main-warehouse");
    });

    it("should throw error when slug is missing", () => {
      const warehouseWithoutSlug = { ...mockLocalWarehouse, slug: "" };
      expect(() => comparator.testGetEntityName(warehouseWithoutSlug)).toThrow(
        "Warehouse must have a valid slug"
      );
    });
  });

  describe("validateUniqueIdentifiers", () => {
    it("should validate unique slugs", () => {
      const warehouses = [mockLocalWarehouse, { ...mockLocalWarehouse, name: "Another Warehouse" }];

      expect(() => comparator.testValidateUniqueIdentifiers(warehouses)).toThrow(
        "Duplicate entity identifiers found in Warehouses: main-warehouse"
      );
    });
  });

  describe("deduplicateEntities", () => {
    it("should deduplicate by slug", () => {
      const warehouses = [
        mockLocalWarehouse,
        { ...mockLocalWarehouse, name: "Duplicate Warehouse" },
        { ...mockLocalWarehouse, slug: "secondary-warehouse", name: "Secondary Warehouse" },
      ];

      const deduplicated = comparator.testDeduplicateEntities(warehouses);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].slug).toBe("main-warehouse");
      expect(deduplicated[1].slug).toBe("secondary-warehouse");
    });
  });
});
