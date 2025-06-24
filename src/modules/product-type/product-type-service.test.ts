import { describe, expect, it, vi } from "vitest";
import { ProductTypeService } from "./product-type-service";
import { AttributeService } from "../attribute/attribute-service";
import type { ProductType } from "./repository";

describe("ProductTypeService", () => {
  describe("bootstrapProductType", () => {
    it("should not create a product type that already exists", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Product Type 1",
        productAttributes: [],
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
        attributes: [
          {
            name: "Color",
            inputType: "DROPDOWN",
            values: [{ name: "Red" }],
          },
        ],
      });

      // Then
      expect(
        mockProductTypeOperations.createProductType
      ).not.toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).toHaveBeenCalledWith({
        name: "Color",
        type: "PRODUCT_TYPE",
        slug: "color",
        inputType: "DROPDOWN",
        values: [{ name: "Red" }],
      });
    });

    it("should create a new product type and assign attributes when it doesn't exist", async () => {
      const newProductType: ProductType = {
        id: "1",
        name: "New Product Type",
        productAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(null),
        createProductType: vi.fn().mockResolvedValue(newProductType),
        assignAttributesToProductType: vi.fn().mockResolvedValue({ id: "1" }),
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
        getAttributesByNames: vi.fn().mockResolvedValue([newAttribute]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When
      await service.bootstrapProductType({
        name: newProductType.name,
        attributes: [
          {
            name: "Color",
            inputType: "DROPDOWN",
            values: [{ name: "Red" }],
          },
        ],
      });

      // Then
      expect(mockProductTypeOperations.createProductType).toHaveBeenCalledWith({
        name: newProductType.name,
        kind: "NORMAL",
        hasVariants: false,
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
        attributes: [
          {
            name: "Color",
            inputType: "DROPDOWN",
            values: [{ name: "Red" }],
          },
        ],
      });

      // Then
      expect(
        mockProductTypeOperations.assignAttributesToProductType
      ).not.toHaveBeenCalled();
    });

    it("should handle errors during attribute assignment", async () => {
      const newProductType: ProductType = {
        id: "1",
        name: "New Product Type",
        productAttributes: [],
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
        getAttributesByNames: vi.fn().mockResolvedValue([newAttribute]),
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
          attributes: [
            {
              name: "Color",
              inputType: "DROPDOWN",
              values: [{ name: "Red" }],
            },
          ],
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
        getAttributesByNames: vi.fn().mockResolvedValue([
          existingGenreAttribute,
          existingAuthorAttribute,
        ]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const updateAttributeSpy = vi.spyOn(attributeService, 'updateAttribute');

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
        attributes: [
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
      });

      // Then
      expect(updateAttributeSpy).toHaveBeenCalledWith(
        {
          name: "Genre",
          inputType: "DROPDOWN",
          values: [
            { name: "Fiction" },
            { name: "Non-Fiction" },
            { name: "Romance" },
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
        productAttributes: [
          { id: "attr-1", name: "Genre" },
        ],
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
          ],
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
        getAttributesByNames: vi.fn().mockResolvedValue([existingGenreAttribute]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
        attributes: [
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
        attributeIds: ["attr-2"],
      });
    });

    it("should handle create input (name only)", async () => {
      const existingProductType: ProductType = {
        id: "1",
        name: "Book",
        productAttributes: [],
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
      });

      // Then
      expect(result).toBe(existingProductType);
      expect(mockAttributeOperations.updateAttribute).not.toHaveBeenCalled();
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
    });
  });

  describe("createProductType", () => {
    it("should create a new product type with minimal input", async () => {
      const newProductType: ProductType = {
        id: "1",
        name: "Electronics",
        productAttributes: [],
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn(),
        createProductType: vi.fn().mockResolvedValue(newProductType),
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
      const result = await service.createProductType({
        name: "Electronics",
      });

      // Then
      expect(mockProductTypeOperations.createProductType).toHaveBeenCalledWith({
        name: "Electronics",
        kind: "NORMAL",
        hasVariants: false,
        isShippingRequired: false,
        taxClass: null,
      });
      expect(result).toBe(newProductType);
    });
  });
});
