import { describe, expect, it } from "vitest";
import type { TaxClassInput } from "../../../modules/config/schema/schema";
import { taxClassComparator } from "./tax-class-comparator";

interface TaxClassEntity extends TaxClassInput, Record<string, unknown> {
  id?: string;
}

describe("TaxClassComparator", () => {
  const comparator = taxClassComparator;
  const changesBetween = (local: TaxClassEntity, remote: TaxClassEntity) =>
    comparator.compare([local], [remote])[0]?.changes ?? [];

  describe("compare", () => {
    it("should detect new tax classes", () => {
      const local: TaxClassEntity[] = [
        {
          name: "Standard Rate",
          countryRates: [{ countryCode: "US", rate: 8.5 }],
        },
      ];
      const remote: TaxClassEntity[] = [];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        operation: "CREATE",
        entityType: "TaxClasses",
        entityName: "Standard Rate",
        desired: local[0],
      });
    });

    it("should detect removed tax classes", () => {
      const local: TaxClassEntity[] = [];
      const remote: TaxClassEntity[] = [
        {
          id: "tax-1",
          name: "Old Rate",
          countryRates: [{ countryCode: "US", rate: 10 }],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        operation: "DELETE",
        entityType: "TaxClasses",
        entityName: "Old Rate",
        current: remote[0],
      });
    });

    it("should detect updated tax classes", () => {
      const local: TaxClassEntity[] = [
        {
          name: "Standard Rate",
          countryRates: [
            { countryCode: "US", rate: 9.0 }, // changed rate
            { countryCode: "GB", rate: 20 }, // added country
          ],
        },
      ];
      const remote: TaxClassEntity[] = [
        {
          id: "tax-1",
          name: "Standard Rate",
          countryRates: [{ countryCode: "US", rate: 8.5 }],
        },
      ];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(1);
      expect(results[0].operation).toBe("UPDATE");
      expect(results[0].entityName).toBe("Standard Rate");
      expect(results[0].changes).toHaveLength(2); // rate change + added country
    });

    it("should detect no changes for identical tax classes", () => {
      const taxClass: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 },
        ],
      };
      const local = [taxClass];
      const remote = [{ ...taxClass, id: "tax-1" }];

      const results = comparator.compare(local, remote);

      expect(results).toHaveLength(0);
    });

    it("should validate unique identifiers", () => {
      const duplicateLocal: TaxClassEntity[] = [
        { name: "Standard Rate" },
        { name: "Standard Rate" }, // duplicate
      ];
      const remote: TaxClassEntity[] = [];

      expect(() => comparator.compare(duplicateLocal, remote)).toThrow(
        /Duplicate entity identifiers found in TaxClasses: Standard Rate/
      );
    });
  });

  describe("field changes", () => {
    it("should detect country rate additions", () => {
      const local: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 }, // added
        ],
      };
      const remote: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const changes = changesBetween(local, remote);

      expect(changes).toHaveLength(1);
      expect(changes[0].description).toContain("Tax rate for GB added: 20%");
    });

    it("should detect country rate removals", () => {
      const local: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };
      const remote: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [
          { countryCode: "US", rate: 8.5 },
          { countryCode: "GB", rate: 20 }, // removed
        ],
      };

      const changes = changesBetween(local, remote);

      expect(changes).toHaveLength(1);
      expect(changes[0].description).toContain("Tax rate for GB removed (was 20%)");
    });

    it("should detect country rate changes", () => {
      const local: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 9.0 }], // changed from 8.5
      };
      const remote: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const changes = changesBetween(local, remote);

      expect(changes).toHaveLength(1);
      expect(changes[0].description).toContain("Tax rate for US: 8.5% → 9%");
    });

    it("should handle empty country rates", () => {
      const local: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [],
      };
      const remote: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const changes = changesBetween(local, remote);

      expect(changes).toHaveLength(1);
      expect(changes[0].description).toContain("Tax rate for US removed");
    });

    it("should handle missing country rates", () => {
      const local: TaxClassEntity = {
        name: "Standard Rate",
      };
      const remote: TaxClassEntity = {
        name: "Standard Rate",
        countryRates: [{ countryCode: "US", rate: 8.5 }],
      };

      const changes = changesBetween(local, remote);

      expect(changes).toHaveLength(1);
      expect(changes[0].description).toContain("Tax rate for US removed");
    });
  });

  describe("identifier", () => {
    it("should return the tax class name", () => {
      const entity: TaxClassEntity = { name: "Standard Rate" };
      expect(comparator.compare([entity], [])[0].entityName).toBe("Standard Rate");
    });

    it("should throw error for tax class without name", () => {
      const entity = { name: "", countryRates: [] } as unknown as TaxClassEntity;
      expect(() => comparator.compare([entity], [])).toThrow("Tax class must have a valid name");
    });
  });
});
