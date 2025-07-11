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
        productAttributes: [],
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

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.bootstrapProductType({
        name: existingProductType.name,
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
      expect(mockProductTypeOperations.createProductType).not.toHaveBeenCalled();
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
        variantAttributes: [],
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

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.bootstrapProductType({
        name: newProductType.name,
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
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributeIds: [newAttribute.id, newAttribute.id],
        type: "PRODUCT",
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: newProductType.id,
        attributeIds: [newAttribute.id],
        type: "VARIANT",
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

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.bootstrapProductType({
        name: existingProductType.name,
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
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["1"],
        type: "PRODUCT",
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["1"],
        type: "VARIANT",
      });
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
        getAttributesByNames: vi.fn().mockResolvedValue([newAttribute]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When/Then
      await expect(
        service.bootstrapProductType({
          name: newProductType.name,
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
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const updateAttributeSpy = vi.spyOn(attributeService, "updateAttribute");

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
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
          values: [{ name: "Fiction" }, { name: "Non-Fiction" }, { name: "Romance" }],
          type: "PRODUCT_TYPE",
        },
        existingGenreAttribute
      );
      expect(mockAttributeOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["attr-1", "attr-2"],
        type: "PRODUCT",
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["attr-1", "attr-2"],
        type: "VARIANT",
      });
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
        getAttributesByNames: vi.fn().mockResolvedValue([existingGenreAttribute]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

      // When
      await service.updateProductType(existingProductType, {
        name: "Book",
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
        attributeIds: ["attr-2", "attr-1"],
        type: "PRODUCT",
      });
      expect(mockProductTypeOperations.assignAttributesToProductType).toHaveBeenCalledWith({
        productTypeId: "1",
        attributeIds: ["attr-1"],
        type: "VARIANT",
      });
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

      const service = new ProductTypeService(mockProductTypeOperations, attributeService);

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
});
