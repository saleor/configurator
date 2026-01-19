import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "../attribute/attribute-service";
import type { AttributeOperations } from "../attribute/repository";
import type { AttributeInput } from "../config/schema/attribute.schema";
import { ProductTypeAttributeValidationError } from "./errors";
import { ProductTypeService } from "./product-type-service";
import type { ProductType, ProductTypeOperations } from "./repository";

/** Create mock product type operations with default implementations */
const createMockProductTypeOperations = (
  overrides: Partial<ProductTypeOperations> = {}
): ProductTypeOperations => ({
  getProductTypeByName: vi.fn().mockResolvedValue(null),
  createProductType: vi.fn(),
  assignAttributesToProductType: vi.fn(),
  ...overrides,
});

/** Create mock attribute operations with default implementations */
const createMockAttributeOperations = (
  overrides: Partial<AttributeOperations> = {}
): AttributeOperations => ({
  createAttribute: vi.fn(),
  updateAttribute: vi.fn(),
  getAttributesByNames: vi.fn().mockResolvedValue([]),
  bulkCreateAttributes: vi.fn(),
  bulkUpdateAttributes: vi.fn(),
  ...overrides,
});

/** Create a ProductTypeService with mocked dependencies */
const createTestService = (
  productTypeOps: Partial<ProductTypeOperations> = {},
  attributeOps: Partial<AttributeOperations> = {}
) => {
  const mockProductTypeOperations = createMockProductTypeOperations(productTypeOps);
  const mockAttributeOperations = createMockAttributeOperations(attributeOps);
  const attributeService = new AttributeService(mockAttributeOperations);
  const service = new ProductTypeService(mockProductTypeOperations, attributeService);

  return {
    service,
    attributeService,
    mockProductTypeOperations,
    mockAttributeOperations,
  };
};

describe("ProductTypeService", () => {
  describe("bootstrapProductType", () => {
    it("should not create a product type that already exists", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Product Type 1",
        productAttributes: [{ id: "1", name: "Color" }],
        variantAttributes: [],
      };

      const { service, mockProductTypeOperations, mockAttributeOperations } = createTestService({
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
      });

      // When
      await service.bootstrapProductType({
        name: existingProductType.name,
        isShippingRequired: false,
        productAttributes: [{ name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }] }],
        variantAttributes: [],
      });

      // Then
      expect(mockProductTypeOperations.createProductType).not.toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockProductTypeOperations.assignAttributesToProductType).not.toHaveBeenCalled();
    });

    it("should create a new product type and assign attributes when it doesn't exist", async () => {
      const newProductType: ProductType = {
        id: "2",
        name: "New Product Type",
        productAttributes: [],
        variantAttributes: [],
      };

      const newAttribute = {
        id: "1",
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
      };

      const { service, mockProductTypeOperations, mockAttributeOperations } = createTestService(
        { createProductType: vi.fn().mockResolvedValue(newProductType) },
        { createAttribute: vi.fn().mockResolvedValue(newAttribute) }
      );

      // When
      await service.bootstrapProductType({
        name: newProductType.name,
        isShippingRequired: false,
        productAttributes: [{ name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }] }],
        variantAttributes: [],
      });

      // Then
      expect(mockProductTypeOperations.createProductType).toHaveBeenCalledWith({
        name: newProductType.name,
        kind: "NORMAL",
        hasVariants: true,
        isShippingRequired: false,
        taxClass: null,
      });
      expect(mockAttributeOperations.createAttribute).toHaveBeenCalledWith({
        name: "Color",
        type: "PRODUCT_TYPE",
        slug: "color",
        inputType: "DROPDOWN",
        values: [{ name: "Red" }],
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributes: [{ id: newAttribute.id, variantSelection: undefined }],
        type: "PRODUCT",
      });
    });

    it("should not assign attributes that are already assigned", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Product Type 1",
        productAttributes: [
          {
            id: "1",
            name: "Color",
          },
        ],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const existingAttribute = {
        id: "1",
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(existingAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([existingAttribute]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.bootstrapProductType({
        name: existingProductType.name,
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Color",
            inputType: "DROPDOWN",
            values: [{ name: "Red" }],
          },
        ],
        variantAttributes: [],
      });

      // Then - Since the attribute is already assigned, no new assignment should be made
      expect(mockProductTypeOperations.assignAttributesToProductType).not.toHaveBeenCalled();
    });

    it("should handle errors during attribute assignment", async () => {
      const newProductType: ProductType = {
        id: "1",
        name: "New Product Type",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn().mockRejectedValue(new Error("Assignment failed")),
      };

      const newAttribute = {
        id: "1",
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(newAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]), // Color doesn't exist globally
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When/Then
      await expect(
        service.bootstrapProductType({
          name: newProductType.name,
          isShippingRequired: false,
          productAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN",
              values: [{ name: "Red" }],
            },
          ],
          variantAttributes: [],
        })
      ).rejects.toThrow("Assignment failed");
    });
  });

  describe("updateProductType", () => {
    it("should update existing attributes with new values", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Book",
        productAttributes: [
          { id: "attr-1", name: "Genre" },
          { id: "attr-2", name: "Author" },
        ],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const existingGenreAttribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }, { node: { name: "Non-Fiction" } }],
        },
      };

      const existingAuthorAttribute = {
        id: "attr-2",
        name: "Author",
        type: "PRODUCT_TYPE",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      };

      const updatedGenreAttribute = {
        ...existingGenreAttribute,
        choices: {
          edges: [
            { node: { name: "Fiction" } },
            { node: { name: "Non-Fiction" } },
            { node: { name: "Romance" } },
          ],
        },
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn().mockResolvedValue(updatedGenreAttribute),
        getAttributesByNames: vi
          .fn()
          .mockResolvedValue([existingGenreAttribute, existingAuthorAttribute]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const updateAttributeSpy = vi.spyOn(attributeService, "updateAttribute");

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [
              { name: "Fiction" },
              { name: "Non-Fiction" },
              { name: "Romance" }, // New value
            ],
          },
          {
            name: "Author",
            inputType: "PLAIN_TEXT",
          },
        ],
        variantAttributes: [],
      });

      // Then
      expect(updateAttributeSpy).toHaveBeenCalledWith(
        {
          name: "Genre",
          inputType: "DROPDOWN",
          values: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
            { name: "Romance" }, // New value
          ],
          type: "PRODUCT_TYPE",
        },
        existingGenreAttribute
      );
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockProductTypeOperations.assignAttributesToProductType).not.toHaveBeenCalled();
    });

    it("should create new attributes and update existing ones", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Book",
        productAttributes: [{ id: "attr-1", name: "Genre" }],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const existingGenreAttribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }],
        },
      };

      const newAuthorAttribute = {
        id: "attr-2",
        name: "Author",
        type: "PRODUCT_TYPE",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(newAuthorAttribute),
        updateAttribute: vi.fn().mockResolvedValue(existingGenreAttribute),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // Set up the mock to return existing attributes only for "Genre"
      vi.mocked(mockAttributeOperations.getAttributesByNames)
        .mockResolvedValueOnce([existingGenreAttribute]) // For updateAttributes call
        .mockResolvedValueOnce([]); // For createAttributes call (Author doesn't exist)

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Genre",
            inputType: "DROPDOWN",
            values: [
              { name: "Fiction" },
              { name: "Romance" }, // New value
            ],
          },
          {
            name: "Author", // New attribute
            inputType: "PLAIN_TEXT",
          },
        ],
        variantAttributes: [],
      });

      // Then
      expect(mockAttributeOperations.updateAttribute).toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).toHaveBeenCalledWith({
        name: "Author",
        type: "PRODUCT_TYPE",
        slug: "author",
        inputType: "PLAIN_TEXT",
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributes: [{ id: "attr-2", variantSelection: undefined }],
        type: "PRODUCT",
      });
      // Only one call should be made since variantAttributes is empty
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledTimes(1);
    });

    it("should handle create input (name only)", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Book",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      const result = await service.bootstrapProductType({
        name: "Book", // Create input - name only
        isShippingRequired: false,
      });

      // Then
      expect(result).toBe(existingProductType);
      expect(mockAttributeOperations.updateAttribute).not.toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
    });

    it("should reuse existing global attribute instead of creating duplicate", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Book",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const existingAuthorAttribute = {
        id: "attr-1",
        name: "Author",
        type: "PRODUCT_TYPE",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockImplementation(({ names }) => {
          // Return existing attribute when "Author" is requested
          if (names.includes("Author")) {
            return [existingAuthorAttribute];
          }
          // Return empty array for other attributes
          return [];
        }),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      const result = await service.updateProductType(existingProductType, {
        name: "Book",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "Author", // This attribute already exists globally
            inputType: "PLAIN_TEXT",
          },
        ],
        variantAttributes: [],
      });

      // Then - Should succeed and reuse existing attribute
      expect(result).toBe(existingProductType);
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockAttributeOperations.updateAttribute).not.toHaveBeenCalled();
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributes: [{ id: "attr-1", variantSelection: undefined }],
        type: "PRODUCT",
      });
    });

    it("should not throw duplicate error when attribute is defined only once in config but exists from previous deployment", async () => {
      // This test reproduces the bug: "License Type error when only defined once in config"
      // Scenario: User has deployed before, so attribute exists in Saleor
      // But in current config, it's only defined once
      // The system should NOT throw duplicate error

      const existingProductType: ProductType = {
        id: "1",
        name: "Digital Products",
        productAttributes: [], // Currently no attributes assigned
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      // This attribute exists in Saleor from a previous deployment
      const existingLicenseAttribute = {
        id: "attr-1",
        name: "License Type",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "MIT" } }],
        },
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockImplementation(({ names }) => {
          // Return existing attribute when "License Type" is requested
          if (names.includes("License Type")) {
            return [existingLicenseAttribute];
          }
          return [];
        }),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When user tries to update product type with License Type attribute
      // This is the only place License Type is defined in the current config
      // This should NOT throw because the attribute is only defined once in config
      await service.updateProductType(existingProductType, {
        name: "Digital Products",
        isShippingRequired: false,
        productAttributes: [
          {
            name: "License Type", // Only defined once in config
            inputType: "DROPDOWN",
            values: [{ name: "MIT" }, { name: "GPL" }],
          },
        ],
        variantAttributes: [],
      });

      // Should not create new attribute since it exists, just assign it
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributes: [{ id: "attr-1", variantSelection: undefined }],
        type: "PRODUCT",
      });
    });
  });

  describe("REFERENCE attribute validation", () => {
    it("should throw validation error when REFERENCE attribute is missing entityType", async () => {
      // Given
      const existingProductType: ProductType = {
        id: "1",
        name: "Walkly Product",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When/Then
      // Intentionally invalid input to test runtime validation
      const invalidProductAttributes = [
        {
          name: "Photographer reference product",
          inputType: "REFERENCE",
          // Missing entityType - should cause validation error
        },
      ] as AttributeInput[];

      await expect(
        service.bootstrapProductType({
          name: "Walkly Product",
          isShippingRequired: false,
          productAttributes: invalidProductAttributes,
          variantAttributes: [],
        })
      ).rejects.toThrow(ProductTypeAttributeValidationError);

      await expect(
        service.bootstrapProductType({
          name: "Walkly Product",
          isShippingRequired: false,
          productAttributes: invalidProductAttributes,
          variantAttributes: [],
        })
      ).rejects.toThrow(
        /Attribute "Photographer reference product" is a REFERENCE type but missing required 'entityType'/
      );
    });

    it("should throw validation error when variantAttribute REFERENCE is missing entityType", async () => {
      // Given
      const existingProductType: ProductType = {
        id: "1",
        name: "Walkly Product",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When/Then
      // Intentionally invalid input to test runtime validation
      const invalidVariantAttributes = [
        {
          name: "Property reference variant",
          inputType: "REFERENCE",
          // Missing entityType - should cause validation error
        },
      ] as AttributeInput[];

      await expect(
        service.bootstrapProductType({
          name: "Walkly Product",
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: invalidVariantAttributes,
        })
      ).rejects.toThrow(ProductTypeAttributeValidationError);
    });

    it("should not throw validation error when REFERENCE attribute has entityType", async () => {
      // Given
      const existingProductType: ProductType = {
        id: "1",
        name: "Walkly Product",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(existingProductType),
        assignAttributesToProductType: vi.fn(),
      };

      const newAttribute = {
        id: "attr-1",
        name: "Photographer reference product",
        inputType: "REFERENCE",
        entityType: "PAGE",
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(newAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When/Then - should not throw
      await expect(
        service.bootstrapProductType({
          name: "Walkly Product",
          isShippingRequired: false,
          productAttributes: [
            {
              name: "Photographer reference product",
              inputType: "REFERENCE",
              entityType: "PAGE", // Has entityType - should not throw
            },
          ],
          variantAttributes: [],
        })
      ).resolves.not.toThrow();
    });
  });

  describe("referenced attribute resolution failure", () => {
    it("should throw error when referenced attributes fail to resolve", async () => {
      const existingProductType: ProductType = {
        id: "7",
        name: "Product With Failed Resolution",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        // Return null to simulate resolution failure (network error, etc.)
        getAttributesByNames: vi.fn().mockResolvedValue(null),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // Using a referenced attribute that will fail to resolve
      // The error is wrapped by ServiceErrorWrapper, so we check the message content
      await expect(
        service.bootstrapProductType({
          name: existingProductType.name,
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [
            {
              attribute: "NonExistentAttribute", // Referenced by name
              variantSelection: true,
            },
          ],
        })
      ).rejects.toThrow(/Failed to resolve referenced attributes/);
    });

    it("should not throw when no referenced attributes need resolution", async () => {
      const existingProductType: ProductType = {
        id: "8",
        name: "Product With Inline Attributes Only",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(existingProductType),
        assignAttributesToProductType: vi.fn(),
      };

      const colorAttribute = {
        id: "color-inline",
        name: "Color",
        inputType: "DROPDOWN" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(colorAttribute),
        updateAttribute: vi.fn(),
        // Return null, but since there are no referenced attrs, it should be fine
        getAttributesByNames: vi.fn().mockResolvedValue(null),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // Only inline attributes, no referenced ones
      await expect(
        service.bootstrapProductType({
          name: existingProductType.name,
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color", // Inline attribute, not referenced
              inputType: "DROPDOWN",
              values: [{ name: "Red" }],
            },
          ],
        })
      ).resolves.not.toThrow();
    });
  });

  describe("variantSelection", () => {
    it("should pass variantSelection to assignment when true for supported input type", async () => {
      const newProductType: ProductType = {
        id: "2",
        name: "T-Shirt",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn(),
      };

      const colorAttribute = {
        id: "color-1",
        name: "Color",
        inputType: "DROPDOWN" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(colorAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      await service.bootstrapProductType({
        name: newProductType.name,
        isShippingRequired: false,
        productAttributes: [],
        variantAttributes: [
          {
            name: "Color",
            inputType: "DROPDOWN",
            values: [{ name: "Red" }, { name: "Blue" }],
            variantSelection: true,
          },
        ],
      });

      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributes: [{ id: colorAttribute.id, variantSelection: true }],
        type: "VARIANT",
      });
    });

    it("should throw validation error when variantSelection is used with unsupported input type", async () => {
      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn(),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // PLAIN_TEXT does not support variantSelection
      await expect(
        service.bootstrapProductType({
          name: "Invalid Product Type",
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Description",
              inputType: "PLAIN_TEXT",
              variantSelection: true,
            },
          ],
        })
      ).rejects.toThrow(ProductTypeAttributeValidationError);
    });

    it("should allow variantSelection with all supported input types", async () => {
      const newProductType: ProductType = {
        id: "3",
        name: "Product With All Variant Types",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn(),
      };

      // Create mock attributes for each supported type
      const dropdownAttr = { id: "dropdown-1", name: "Color", inputType: "DROPDOWN" as const };
      const booleanAttr = { id: "boolean-1", name: "Is Organic", inputType: "BOOLEAN" as const };
      const swatchAttr = { id: "swatch-1", name: "Pattern", inputType: "SWATCH" as const };
      const numericAttr = { id: "numeric-1", name: "Size Number", inputType: "NUMERIC" as const };

      let createCallCount = 0;
      const mockAttributeOperations = {
        createAttribute: vi.fn().mockImplementation(() => {
          createCallCount++;
          switch (createCallCount) {
            case 1:
              return Promise.resolve(dropdownAttr);
            case 2:
              return Promise.resolve(booleanAttr);
            case 3:
              return Promise.resolve(swatchAttr);
            case 4:
              return Promise.resolve(numericAttr);
            default:
              return Promise.resolve(dropdownAttr);
          }
        }),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // All of these input types should support variantSelection
      await expect(
        service.bootstrapProductType({
          name: newProductType.name,
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN",
              values: [{ name: "Red" }],
              variantSelection: true,
            },
            {
              name: "Is Organic",
              inputType: "BOOLEAN",
              variantSelection: true,
            },
            {
              name: "Pattern",
              inputType: "SWATCH",
              values: [{ name: "Striped" }],
              variantSelection: true,
            },
            {
              name: "Size Number",
              inputType: "NUMERIC",
              variantSelection: true,
            },
          ],
        })
      ).resolves.not.toThrow();
    });

    it("should not pass variantSelection when false or undefined", async () => {
      const newProductType: ProductType = {
        id: "4",
        name: "Simple Product",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn(),
      };

      const sizeAttribute = {
        id: "size-1",
        name: "Size",
        inputType: "DROPDOWN" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(sizeAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      await service.bootstrapProductType({
        name: newProductType.name,
        isShippingRequired: false,
        productAttributes: [],
        variantAttributes: [
          {
            name: "Size",
            inputType: "DROPDOWN",
            values: [{ name: "S" }, { name: "M" }],
            // No variantSelection specified
          },
        ],
      });

      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributes: [{ id: sizeAttribute.id, variantSelection: undefined }],
        type: "VARIANT",
      });
    });

    it("should throw validation error when referenced attribute with variantSelection has unsupported input type", async () => {
      const existingProductType: ProductType = {
        id: "5",
        name: "Product With Referenced Attr",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      // The referenced attribute has PLAIN_TEXT input type which doesn't support variantSelection
      const plainTextAttribute = {
        id: "plaintext-1",
        name: "Description",
        inputType: "PLAIN_TEXT" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([plainTextAttribute]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // Using a referenced attribute with variantSelection: true but the attribute has unsupported inputType
      await expect(
        service.bootstrapProductType({
          name: existingProductType.name,
          isShippingRequired: false,
          productAttributes: [],
          variantAttributes: [
            {
              attribute: "Description", // Referenced by name
              variantSelection: true,
            },
          ],
        })
      ).rejects.toThrow(/does not support variant selection/);
    });

    it("should pass variantSelection for referenced attribute with supported input type", async () => {
      const existingProductType: ProductType = {
        id: "6",
        name: "Product With Valid Referenced Attr",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      // The referenced attribute has DROPDOWN input type which supports variantSelection
      const dropdownAttribute = {
        id: "dropdown-ref-1",
        name: "Color",
        inputType: "DROPDOWN" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([dropdownAttribute]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      await service.bootstrapProductType({
        name: existingProductType.name,
        isShippingRequired: false,
        productAttributes: [],
        variantAttributes: [
          {
            attribute: "Color", // Referenced by name
            variantSelection: true,
          },
        ],
      });

      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: existingProductType.id,
        attributes: [{ id: dropdownAttribute.id, variantSelection: true }],
        type: "VARIANT",
      });
    });

    it("should not throw validation error when variantSelection is on productAttributes", async () => {
      // variantSelection validation only applies to variantAttributes, not productAttributes
      // When specified on a productAttribute, it should not throw validation error
      // (The repository layer handles filtering variantSelection for PRODUCT type)
      const newProductType: ProductType = {
        id: "9",
        name: "Product With VariantSelection on ProductAttr",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn(),
      };

      const colorAttribute = {
        id: "color-1",
        name: "Color",
        inputType: "DROPDOWN" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue(colorAttribute),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // variantSelection on productAttribute should not throw validation error
      // (variantSelection validation is only done for variantAttributes)
      await expect(
        service.bootstrapProductType({
          name: newProductType.name,
          isShippingRequired: false,
          productAttributes: [
            {
              name: "Color",
              inputType: "DROPDOWN",
              values: [{ name: "Red" }],
              variantSelection: true, // This should not cause validation error
            },
          ],
          variantAttributes: [],
        })
      ).resolves.not.toThrow();

      // Service passes variantSelection through; repository filters it for PRODUCT type
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributes: [{ id: colorAttribute.id, variantSelection: true }],
        type: "PRODUCT",
      });
    });
  });
});
