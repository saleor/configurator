import { describe, expect, it, vi } from "vitest";
import { AttributeCache, type CachedAttribute } from "../attribute/attribute-cache";
import type { CustomerTypeInput } from "../config/schema/schema";
import { CustomerTypeService } from "./customer-type-service";
import { CustomerTypeOperationError, CustomerTypeValidationError } from "./errors";
import type { CustomerType, CustomerTypeOperations } from "./repository";

const retailInput: CustomerTypeInput = {
  name: "Retail",
  slug: "retail",
  isDefault: true,
};

const remoteRetail: CustomerType = {
  id: "ct-1",
  name: "Retail",
  slug: "retail",
  isDefault: true,
  attributes: [],
};

const cachedAttribute: CachedAttribute = {
  id: "attr-1",
  name: "Loyalty Tier",
  slug: "loyalty-tier",
  inputType: "DROPDOWN",
  entityType: null,
  choices: [],
};

function createOperations(overrides: Partial<CustomerTypeOperations> = {}) {
  return {
    getCustomerTypes: vi.fn().mockResolvedValue([]),
    createCustomerType: vi.fn().mockResolvedValue(remoteRetail),
    updateCustomerType: vi.fn().mockResolvedValue(remoteRetail),
    assignAttributes: vi.fn().mockResolvedValue({ id: remoteRetail.id }),
    ...overrides,
  } satisfies CustomerTypeOperations;
}

function createCacheWithCustomerAttribute() {
  const cache = new AttributeCache();
  cache.populate("customer", [cachedAttribute]);
  return cache;
}

describe("CustomerTypeService", () => {
  describe("bootstrapCustomerTypes", () => {
    it("creates a customer type that does not exist remotely", async () => {
      const operations = createOperations();
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes([retailInput]);

      expect(operations.createCustomerType).toHaveBeenCalledWith({
        name: "Retail",
        slug: "retail",
        isDefault: true,
      });
      expect(operations.updateCustomerType).not.toHaveBeenCalled();
    });

    it("updates an existing customer type when fields differ", async () => {
      const operations = createOperations({
        getCustomerTypes: vi
          .fn()
          .mockResolvedValue([{ ...remoteRetail, name: "Old name", isDefault: false }]),
      });
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes([retailInput]);

      expect(operations.updateCustomerType).toHaveBeenCalledWith("ct-1", {
        name: "Retail",
        slug: "retail",
        isDefault: true,
      });
      expect(operations.createCustomerType).not.toHaveBeenCalled();
    });

    it("does not update when the remote customer type already matches", async () => {
      const operations = createOperations({
        getCustomerTypes: vi.fn().mockResolvedValue([remoteRetail]),
      });
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes([retailInput]);

      expect(operations.createCustomerType).not.toHaveBeenCalled();
      expect(operations.updateCustomerType).not.toHaveBeenCalled();
    });

    it("fetches remote customer types once regardless of input count", async () => {
      const operations = createOperations();
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes([
        retailInput,
        { name: "Wholesale", slug: "wholesale", isDefault: false },
        { name: "Partner", slug: "partner", isDefault: false },
      ]);

      expect(operations.getCustomerTypes).toHaveBeenCalledTimes(1);
    });

    it("rejects duplicate slugs before touching the API", async () => {
      const operations = createOperations();
      const service = new CustomerTypeService(operations);

      await expect(
        service.bootstrapCustomerTypes([retailInput, { ...retailInput, name: "Retail copy" }])
      ).rejects.toThrow(CustomerTypeValidationError);

      expect(operations.getCustomerTypes).not.toHaveBeenCalled();
    });

    it("aggregates failures into a single operation error", async () => {
      const operations = createOperations({
        createCustomerType: vi.fn().mockRejectedValue(new Error("boom")),
      });
      const service = new CustomerTypeService(operations);

      await expect(service.bootstrapCustomerTypes([retailInput])).rejects.toThrow(
        CustomerTypeOperationError
      );
    });
  });

  describe("attribute assignment", () => {
    it("resolves referenced attributes from the customer bucket of the cache", async () => {
      const operations = createOperations();
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes(
        [{ ...retailInput, attributes: [{ attribute: "Loyalty Tier" }] }],
        { attributeCache: createCacheWithCustomerAttribute() }
      );

      expect(operations.assignAttributes).toHaveBeenCalledWith("ct-1", ["attr-1"]);
    });

    it("skips attributes that are already assigned", async () => {
      const operations = createOperations({
        createCustomerType: vi.fn().mockResolvedValue({
          ...remoteRetail,
          attributes: [{ id: "attr-1", name: "Loyalty Tier" }],
        }),
      });
      const service = new CustomerTypeService(operations);

      await service.bootstrapCustomerTypes(
        [{ ...retailInput, attributes: [{ attribute: "Loyalty Tier" }] }],
        { attributeCache: createCacheWithCustomerAttribute() }
      );

      expect(operations.assignAttributes).not.toHaveBeenCalled();
    });

    it("fails when an attribute lives in another section", async () => {
      const cache = new AttributeCache();
      cache.populate("content", [cachedAttribute]);
      const service = new CustomerTypeService(createOperations());

      await expect(
        service.bootstrapCustomerTypes(
          [{ ...retailInput, attributes: [{ attribute: "Loyalty Tier" }] }],
          { attributeCache: cache }
        )
      ).rejects.toThrow(/is a content attribute, not a customer attribute/);
    });

    it("rejects inline attribute definitions", async () => {
      const service = new CustomerTypeService(createOperations());

      await expect(
        service.bootstrapCustomerTypes([
          {
            ...retailInput,
            attributes: [{ name: "Loyalty Tier", inputType: "DROPDOWN", values: [] }],
          },
        ])
      ).rejects.toThrow(/customerAttributes section/);
    });

    it("fails when references cannot be resolved without a cache", async () => {
      const service = new CustomerTypeService(createOperations());

      await expect(
        service.bootstrapCustomerTypes([
          { ...retailInput, attributes: [{ attribute: "Loyalty Tier" }] },
        ])
      ).rejects.toThrow(/attribute cache/);
    });
  });
});
