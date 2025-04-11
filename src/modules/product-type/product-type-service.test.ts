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
});
