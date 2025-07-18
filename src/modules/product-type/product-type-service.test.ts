import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "../attribute/attribute-service";
import { ProductTypeService } from "./product-type-service";
import type { ProductType } from "./repository";

describe("ProductTypeService", () => {
  describe("bootstrapProductType", () => {
    it("should not create a product type that already exists", async () => {
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

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]), // Should not matter, but return empty
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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

      // Then
      expect(
        mockProductTypeOperations.createProductType
      ).not.toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).not.toHaveBeenCalled();
    });

    it("should create a new product type and assign attributes when it doesn't exist", async () => {
      const newProductType: ProductType = {
        id: "2",
        name: "New Product Type",
        productAttributes: [],
        variantAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn(),
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When
      await service.bootstrapProductType({
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
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributeIds: [newAttribute.id],
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).not.toHaveBeenCalled();
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
        assignAttributesToProductType: vi
          .fn()
          .mockRejectedValue(new Error("Assignment failed")),
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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
          edges: [
            { node: { name: "Fiction" } },
            { node: { name: "Non-Fiction" } },
          ],
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const updateAttributeSpy = vi.spyOn(attributeService, "updateAttribute");

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).not.toHaveBeenCalled();
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["attr-2"],
        type: "PRODUCT",
      });
      // Only one call should be made since variantAttributes is empty
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).toHaveBeenCalledTimes(1);
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

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

    it("should throw DuplicateAttributeDefinitionError when trying to create an attribute that already exists globally", async () => {
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When/Then
      await expect(
        service.updateProductType(existingProductType, {
          name: "Book",
          isShippingRequired: false,
          productAttributes: [
            {
              name: "Author", // This attribute already exists globally
              inputType: "PLAIN_TEXT",
            },
          ],
          variantAttributes: [],
        })
      ).rejects.toThrow(
        'Attribute "Author" is already defined elsewhere in the configuration. Use reference syntax instead: "attribute: Author".'
      );

      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockAttributeOperations.updateAttribute).not.toHaveBeenCalled();
    });
  });
});
