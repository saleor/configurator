import { describe, expect, it, vi } from "vitest";
import type { AttributeInput, FullAttribute } from "../config/schema/attribute.schema";
import {
  AttributeNotFoundError,
  WrongAttributeTypeError,
} from "../../lib/errors/validation-errors";
import { AttributeCache } from "./attribute-cache";
import type { CachedAttribute } from "./attribute-cache";
import { AttributeService, validateAttributeReference } from "./attribute-service";
import type { Attribute, AttributeBulkCreateResult, AttributeBulkUpdateResult } from "./repository";

describe("AttributeService", () => {
  describe("bootstrapAttributes", () => {
    it("should create an attribute that already exists", async () => {
      // Given
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

      // When
      await service.bootstrapAttributes({
        attributeInputs: [existingAttribute],
      });

      // Then
      expect(mockOperations.createAttribute).toHaveBeenCalled();
    });
  });

  describe("resolveReferencedAttributes", () => {
    it("should resolve referenced attributes for product types", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "attr-1",
            name: "Author",
            type: "PRODUCT_TYPE",
            inputType: "PLAIN_TEXT",
          },
        ]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Author" }, // Reference to existing attribute
        { name: "New Attribute", inputType: "PLAIN_TEXT" }, // New attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual(["attr-1"]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Author"],
        type: "PRODUCT_TYPE",
      });
    });

    it("should resolve referenced attributes for page types", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "attr-2",
            name: "Published Date",
            type: "PAGE_TYPE",
            inputType: "DATE",
          },
        ]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Published Date" }, // Reference to existing attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PAGE_TYPE");

      // Then
      expect(result).toEqual(["attr-2"]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Published Date"],
        type: "PAGE_TYPE",
      });
    });

    it("should filter out already assigned attributes", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(), // Should not be called
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Author" }, // Already assigned
        { attribute: "Genre" }, // Not assigned
      ];

      const existingAttributeNames = ["Author"]; // Author is already assigned

      // When
      const result = await service.resolveReferencedAttributes(
        inputAttributes,
        "PRODUCT_TYPE",
        existingAttributeNames
      );

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Genre"], // Only Genre should be looked up
        type: "PRODUCT_TYPE",
      });
    });

    it("should return empty array when no referenced attributes", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(), // Should not be called
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { name: "New Attribute", inputType: "PLAIN_TEXT" }, // No references
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).not.toHaveBeenCalled();
    });

    it("should handle case when referenced attributes are not found", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(), // No attributes found
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "NonExistent" }, // Reference to non-existent attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["NonExistent"],
        type: "PRODUCT_TYPE",
      });
    });
  });

  describe("updateAttribute", () => {
    it("should update attribute with new values", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }, { node: { name: "Non-Fiction" } }],
        },
      };

      const updatedAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [
          { name: "Fiction" },
          { name: "Non-Fiction" },
          { name: "Romance" }, // New value
        ],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn().mockResolvedValue({
          ...existingAttribute,
          choices: {
            edges: [
              { node: { name: "Fiction" } },
              { node: { name: "Non-Fiction" } },
              { node: { name: "Romance" } },
            ],
          },
        }),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      // When
      const result = await service.updateAttribute(updatedAttributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).toHaveBeenCalledWith("attr-1", {
        name: "Genre",
        addValues: [{ name: "Romance" }],
      });
      expect(result.choices?.edges).toHaveLength(3);
    });

    it("should not update attribute when no new values", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }, { node: { name: "Non-Fiction" } }],
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

      // When
      const result = await service.updateAttribute(sameAttributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should not update plain text attributes", async () => {
      // Given
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

      // When
      const result = await service.updateAttribute(attributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should handle reference attributes without updates", async () => {
      // Given
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

      // When
      const result = await service.updateAttribute(attributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });
  });

  describe("bootstrapAttributesBulk", () => {
    it("should successfully create multiple attributes in bulk", async () => {
      // Given
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

      // When
      const result = await service.bootstrapAttributesBulk(attributes);

      // Then
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkCreateAttributes).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        errorPolicy: "IGNORE_FAILED",
      });
    });

    it("should handle partial failures in bulk create", async () => {
      // Given
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

      // When
      const result = await service.bootstrapAttributesBulk(attributes);

      // Then
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
      // Given
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }, { name: "M" }, { name: "L" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: {
            id: "1",
            name: "Size",
            type: "PRODUCT_TYPE",
            inputType: "DROPDOWN",
            entityType: null,
            choices: { edges: [{ node: { name: "S" } }, { node: { name: "M" } }] },
          } as Attribute,
        },
        {
          input: {
            name: "Color",
            inputType: "DROPDOWN" as const,
            values: [{ name: "Red" }, { name: "Blue" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: {
            id: "2",
            name: "Color",
            type: "PRODUCT_TYPE",
            inputType: "DROPDOWN",
            entityType: null,
            choices: { edges: [{ node: { name: "Red" } }] },
          } as Attribute,
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

      // When
      const result = await service.updateAttributesBulk(updates);

      // Then
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkUpdateAttributes).toHaveBeenCalledWith({
        attributes: expect.any(Array),
        errorPolicy: "IGNORE_FAILED",
      });
    });

    it("should skip updates when no changes detected", async () => {
      // Given
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: {
            id: "1",
            name: "Size",
            type: "PRODUCT_TYPE",
            inputType: "DROPDOWN",
            entityType: null,
            choices: { edges: [{ node: { name: "S" } }] },
          } as Attribute,
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

      // When
      const result = await service.updateAttributesBulk(updates);

      // Then
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(mockOperations.bulkUpdateAttributes).not.toHaveBeenCalled();
    });

    it("should handle partial failures in bulk update", async () => {
      // Given
      const updates = [
        {
          input: {
            name: "Size",
            inputType: "DROPDOWN" as const,
            values: [{ name: "S" }, { name: "M" }, { name: "L" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: {
            id: "1",
            name: "Size",
            type: "PRODUCT_TYPE",
            inputType: "DROPDOWN",
            entityType: null,
            choices: { edges: [{ node: { name: "S" } }] },
          } as Attribute,
        },
        {
          input: {
            name: "Color",
            inputType: "DROPDOWN" as const,
            values: [{ name: "Red" }, { name: "Blue" }],
            type: "PRODUCT_TYPE" as const,
          },
          existing: {
            id: "2",
            name: "Color",
            type: "PRODUCT_TYPE",
            inputType: "DROPDOWN",
            entityType: null,
            choices: { edges: [{ node: { name: "Red" } }] },
          } as Attribute,
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

      // When
      const result = await service.updateAttributesBulk(updates);

      // Then
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
    };

    const contentAttr: CachedAttribute = {
      id: "attr-content-1",
      name: "SEO Title",
      slug: "seo-title",
      inputType: "PLAIN_TEXT",
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
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(WrongAttributeTypeError);
        const error = result.error as WrongAttributeTypeError;
        expect(error.attributeName).toBe("SEO Title");
        expect(error.foundInSection).toBe("contentAttributes");
        expect(error.expectedSection).toBe("productAttributes");
        expect(error.referencingEntityType).toBe("productTypes");
        expect(error.referencingEntityName).toBe("T-Shirt");
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
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(WrongAttributeTypeError);
        const error = result.error as WrongAttributeTypeError;
        expect(error.attributeName).toBe("Color");
        expect(error.foundInSection).toBe("productAttributes");
        expect(error.expectedSection).toBe("contentAttributes");
        expect(error.referencingEntityType).toBe("modelTypes");
        expect(error.referencingEntityName).toBe("Blog Post");
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
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(AttributeNotFoundError);
        const error = result.error as AttributeNotFoundError;
        expect(error.attributeName).toBe("NonExistent");
        expect(error.expectedSection).toBe("productAttributes");
        expect(error.referencingEntityType).toBe("productTypes");
        expect(error.referencingEntityName).toBe("T-Shirt");
      }
    });

    it("should return AttributeNotFoundError with similar name suggestions via Levenshtein distance", () => {
      const cache = createCache([
        productAttr,
        { id: "attr-prod-2", name: "Colour", slug: "colour", inputType: "DROPDOWN" },
        { id: "attr-prod-3", name: "Size", slug: "size", inputType: "DROPDOWN" },
      ]);

      const result = validateAttributeReference(
        "Colr",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(AttributeNotFoundError);
        const error = result.error as AttributeNotFoundError;
        expect(error.attributeName).toBe("Colr");
        expect(error.similarNames).toBeDefined();
        expect(error.similarNames!.length).toBeGreaterThan(0);
        // "Color" (distance 1) and "Colour" (distance 2) should both be suggested
        expect(error.similarNames).toContain("Color");
        expect(error.similarNames).toContain("Colour");
        // "Size" (distance 4) should NOT be suggested (max distance is 3)
        expect(error.similarNames).not.toContain("Size");
      }
    });

    it("should return AttributeNotFoundError with empty suggestions when no similar names exist", () => {
      const cache = createCache([
        { id: "attr-prod-1", name: "XXXXXXXXXX", slug: "xxxxxxxxxx", inputType: "NUMERIC" },
      ]);

      const result = validateAttributeReference(
        "Color",
        "product",
        "productTypes",
        "T-Shirt",
        cache
      );

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeInstanceOf(AttributeNotFoundError);
        const error = result.error as AttributeNotFoundError;
        expect(error.attributeName).toBe("Color");
        expect(error.similarNames).toEqual([]);
      }
    });
  });

});
