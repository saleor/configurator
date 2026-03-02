import { describe, expect, it, vi } from "vitest";
import {
  AttributeNotFoundError,
  WrongAttributeTypeError,
} from "../../lib/errors/validation-errors";
import type { FullAttribute } from "../config/schema/attribute.schema";
import type { CachedAttribute } from "./attribute-cache";
import { AttributeCache } from "./attribute-cache";
import { AttributeService, validateAttributeReference } from "./attribute-service";
import type { Attribute, AttributeBulkCreateResult, AttributeBulkUpdateResult } from "./repository";

function createTestAttribute(overrides: {
  id: string;
  name: string;
  type?: string;
  inputType: string;
  entityType?: string | null;
  choices?: Attribute["choices"];
}): Attribute {
  return {
    type: "PRODUCT_TYPE",
    entityType: null,
    choices: null,
    ...overrides,
  } as Attribute;
}

describe("AttributeService", () => {
  describe("bootstrapAttributes", () => {
    it("should create an attribute that already exists", async () => {
      const existingAttribute = {
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "1",
            ...existingAttribute,
          },
        ]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      await service.bootstrapAttributes({
        attributeInputs: [existingAttribute],
      });

      expect(mockOperations.createAttribute).toHaveBeenCalled();
    });
  });

  describe("updateAttribute", () => {
    it("should update attribute with new values", async () => {
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "c1", name: "Fiction", value: "fiction" } },
            { node: { id: "c2", name: "Non-Fiction", value: "non-fiction" } },
          ],
        },
      };

      const updatedAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Fiction" }, { name: "Non-Fiction" }, { name: "Romance" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn().mockResolvedValue({
          ...existingAttribute,
          choices: {
            edges: [
              { node: { id: "c1", name: "Fiction", value: "fiction" } },
              { node: { id: "c2", name: "Non-Fiction", value: "non-fiction" } },
              { node: { id: "c3", name: "Romance", value: "romance" } },
            ],
          },
        }),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttribute(updatedAttributeInput, existingAttribute);

      expect(mockOperations.updateAttribute).toHaveBeenCalledWith("attr-1", {
        name: "Genre",
        addValues: [{ name: "Romance" }],
      });
      expect(result.choices?.edges).toHaveLength(3);
    });

    it("should not update attribute when no new values", async () => {
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [
            { node: { id: "c1", name: "Fiction", value: "fiction" } },
            { node: { id: "c2", name: "Non-Fiction", value: "non-fiction" } },
          ],
        },
      };

      const sameAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Fiction" }, { name: "Non-Fiction" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttribute(sameAttributeInput, existingAttribute);

      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should not update plain text attributes", async () => {
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Author",
        type: "PRODUCT_TYPE",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      };

      const attributeInput = {
        name: "Author",
        inputType: "PLAIN_TEXT" as const,
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttribute(attributeInput, existingAttribute);

      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should handle reference attributes without updates", async () => {
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Related Books",
        type: "PRODUCT_TYPE",
        inputType: "REFERENCE",
        entityType: "PRODUCT",
        choices: null,
      };

      const attributeInput = {
        name: "Related Books",
        inputType: "REFERENCE" as const,
        entityType: "PRODUCT" as const,
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttribute(attributeInput, existingAttribute);

      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });
  });

  describe("bootstrapAttributesBulk", () => {
    it("should successfully create multiple attributes in bulk", async () => {
      const attributes: FullAttribute[] = [
        {
          name: "Size",
          inputType: "DROPDOWN",
          values: [{ name: "S" }, { name: "M" }, { name: "L" }],
          type: "PRODUCT_TYPE",
        },
        {
          name: "Color",
          inputType: "DROPDOWN",
          values: [{ name: "Red" }, { name: "Blue" }],
          type: "PRODUCT_TYPE",
        },
        { name: "Material", inputType: "PLAIN_TEXT", type: "PRODUCT_TYPE" },
      ];

      const mockBulkResult: AttributeBulkCreateResult = {
        count: 3,
        results: [
          {
            attribute: {
              id: "1",
              name: "Size",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
          {
            attribute: {
              id: "2",
              name: "Color",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
          {
            attribute: {
              id: "3",
              name: "Material",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "PLAIN_TEXT",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
        ],
        errors: [],
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn().mockResolvedValue(mockBulkResult),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.bootstrapAttributesBulk(attributes);

      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkCreateAttributes).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        errorPolicy: "IGNORE_FAILED",
      });
    });

    it("should handle partial failures in bulk create", async () => {
      const attributes: FullAttribute[] = [
        { name: "Size", inputType: "DROPDOWN", values: [{ name: "S" }], type: "PRODUCT_TYPE" },
        { name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }], type: "PRODUCT_TYPE" },
      ];

      const mockBulkResult: AttributeBulkCreateResult = {
        count: 1,
        results: [
          {
            attribute: {
              id: "1",
              name: "Size",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
          {
            attribute: null,
            errors: [{ path: "name", message: "Attribute already exists", code: "ALREADY_EXISTS" }],
          },
        ],
        errors: [],
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn().mockResolvedValue(mockBulkResult),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.bootstrapAttributesBulk(attributes);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        input: attributes[1],
        errors: ["name: Attribute already exists"],
      });
    });
  });

  describe("updateAttributesBulk", () => {
    it("should successfully update multiple attributes in bulk", async () => {
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }, { name: "M" }, { name: "L" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: createTestAttribute({
            id: "1",
            name: "Size",
            inputType: "DROPDOWN",
            choices: { edges: [{ node: { id: "s1", name: "S", value: "s" } }, { node: { id: "m1", name: "M", value: "m" } }] },
          }),
        },
        {
          input: {
            name: "Color",
            inputType: "DROPDOWN" as const,
            values: [{ name: "Red" }, { name: "Blue" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: createTestAttribute({
            id: "2",
            name: "Color",
            inputType: "DROPDOWN",
            choices: { edges: [{ node: { id: "r1", name: "Red", value: "red" } }] },
          }),
        },
      ];

      const mockBulkResult: AttributeBulkUpdateResult = {
        count: 2,
        results: [
          {
            attribute: {
              id: "1",
              name: "Size",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
          {
            attribute: {
              id: "2",
              name: "Color",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
        ],
        errors: [],
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn().mockResolvedValue(mockBulkResult),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttributesBulk(updates);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkUpdateAttributes).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        errorPolicy: "IGNORE_FAILED",
      });
    });

    it("should skip updates when no changes detected", async () => {
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: createTestAttribute({
            id: "1",
            name: "Size",
            inputType: "DROPDOWN",
            choices: { edges: [{ node: { id: "s1", name: "S", value: "s" } }] },
          }),
        },
      ];

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttributesBulk(updates);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkUpdateAttributes).not.toHaveBeenCalled();
    });

    it("should handle partial failures in bulk update", async () => {
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }, { name: "M" }, { name: "L" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: createTestAttribute({
            id: "1",
            name: "Size",
            inputType: "DROPDOWN",
            choices: { edges: [{ node: { id: "s1", name: "S", value: "s" } }] },
          }),
        },
        {
          input: {
            name: "Color",
            inputType: "DROPDOWN" as const,
            values: [{ name: "Red" }, { name: "Blue" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: createTestAttribute({
            id: "2",
            name: "Color",
            inputType: "DROPDOWN",
            choices: { edges: [{ node: { id: "r1", name: "Red", value: "red" } }] },
          }),
        },
      ];

      const mockBulkResult: AttributeBulkUpdateResult = {
        count: 1,
        results: [
          {
            attribute: {
              id: "1",
              name: "Size",
              slug: null,
              type: "PRODUCT_TYPE",
              inputType: "DROPDOWN",
              entityType: null,
              choices: null,
            },
            errors: [],
          },
          {
            attribute: null,
            errors: [{ path: "values", message: "Invalid value", code: "INVALID" }],
          },
        ],
        errors: [],
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn().mockResolvedValue(mockBulkResult),
      };

      const service = new AttributeService(mockOperations);

      const result = await service.updateAttributesBulk(updates);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        input: updates[1].input,
        errors: ["values: Invalid value"],
      });
    });
  });

  describe("validateAttributeReference", () => {
    function createCache(
      productAttrs: CachedAttribute[] = [],
      contentAttrs: CachedAttribute[] = []
    ): AttributeCache {
      const cache = new AttributeCache();
      cache.populateProductAttributes(productAttrs);
      cache.populateContentAttributes(contentAttrs);
      return cache;
    }

    const productAttr: CachedAttribute = {
      id: "attr-prod-1",
      name: "Color",
      slug: "color",
      inputType: "DROPDOWN",
      entityType: null,
      choices: [],
    };

    const contentAttr: CachedAttribute = {
      id: "attr-content-1",
      name: "SEO Title",
      slug: "seo-title",
      inputType: "PLAIN_TEXT",
      entityType: null,
      choices: [],
    };

    it("should return valid when attribute exists in expected product section", () => {
      const cache = createCache([productAttr]);

      const result = validateAttributeReference(
        "Color",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.attribute).toEqual(productAttr);
      }
    });

    it("should return valid when attribute exists in expected content section", () => {
      const cache = createCache([], [contentAttr]);

      const result = validateAttributeReference(
        "SEO Title",
        "content",
        "modelTypes",
        "Blog Post",
        cache
      );

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.attribute).toEqual(contentAttr);
      }
    });

    it("should return WrongAttributeTypeError when attribute exists in content but looked in product", () => {
      const cache = createCache([], [contentAttr]);

      const result = validateAttributeReference(
        "SEO Title",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid && result.error instanceof WrongAttributeTypeError) {
        expect(result.error.attributeName).toBe("SEO Title");
        expect(result.error.foundInSection).toBe("contentAttributes");
        expect(result.error.expectedSection).toBe("productAttributes");
        expect(result.error.referencingEntityType).toBe("productTypes");
        expect(result.error.referencingEntityName).toBe("T-Shirt");
      } else {
        expect.unreachable("Expected WrongAttributeTypeError");
      }
    });

    it("should return WrongAttributeTypeError when attribute exists in product but looked in content", () => {
      const cache = createCache([productAttr]);

      const result = validateAttributeReference(
        "Color",
        "content",
        "modelTypes",
        "Blog Post",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid && result.error instanceof WrongAttributeTypeError) {
        expect(result.error.attributeName).toBe("Color");
        expect(result.error.foundInSection).toBe("productAttributes");
        expect(result.error.expectedSection).toBe("contentAttributes");
        expect(result.error.referencingEntityType).toBe("modelTypes");
        expect(result.error.referencingEntityName).toBe("Blog Post");
      } else {
        expect.unreachable("Expected WrongAttributeTypeError");
      }
    });

    it("should return AttributeNotFoundError when attribute does not exist anywhere", () => {
      const cache = createCache();

      const result = validateAttributeReference(
        "NonExistent",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid && result.error instanceof AttributeNotFoundError) {
        expect(result.error.attributeName).toBe("NonExistent");
        expect(result.error.expectedSection).toBe("productAttributes");
        expect(result.error.referencingEntityType).toBe("productTypes");
        expect(result.error.referencingEntityName).toBe("T-Shirt");
      } else {
        expect.unreachable("Expected AttributeNotFoundError");
      }
    });

    it("should return AttributeNotFoundError with similar name suggestions via Levenshtein distance", () => {
      const cache = createCache([
        productAttr,
        {
          id: "attr-prod-2",
          name: "Colour",
          slug: "colour",
          inputType: "DROPDOWN",
          entityType: null,
          choices: [],
        },
        {
          id: "attr-prod-3",
          name: "Size",
          slug: "size",
          inputType: "DROPDOWN",
          entityType: null,
          choices: [],
        },
      ]);

      const result = validateAttributeReference(
        "Colr",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid && result.error instanceof AttributeNotFoundError) {
        expect(result.error.attributeName).toBe("Colr");
        expect(result.error.similarNames).toBeDefined();
        expect(result.error.similarNames?.length).toBeGreaterThan(0);
        expect(result.error.similarNames).toContain("Color");
        expect(result.error.similarNames).toContain("Colour");
        expect(result.error.similarNames).not.toContain("Size");
      } else {
        expect.unreachable("Expected AttributeNotFoundError");
      }
    });

    it("should return AttributeNotFoundError with empty suggestions when no similar names exist", () => {
      const cache = createCache([
        {
          id: "attr-prod-1",
          name: "XXXXXXXXXX",
          slug: "xxxxxxxxxx",
          inputType: "NUMERIC",
          entityType: null,
          choices: [],
        },
      ]);

      const result = validateAttributeReference(
        "Color",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid && result.error instanceof AttributeNotFoundError) {
        expect(result.error.attributeName).toBe("Color");
        expect(result.error.similarNames).toEqual([]);
      } else {
        expect.unreachable("Expected AttributeNotFoundError");
      }
    });
  });
});
