import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "../attribute/attribute-service";
import { ProductTypeService } from "./product-type-service";

describe("ProductTypeService", () => {
  describe("is idempotent", () => {
    it("should not create a product type that already exists", async () => {
      const existingProductType = {
        name: "Product Type 1",
      };

      const mockProductTypeOperations = {
        getProductTypeByName: vi.fn().mockResolvedValue(existingProductType),
        createProductType: vi.fn(),
        assignAttributesToProductType: vi.fn(),
      };

      const existingAttribute = {
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "1",
            ...existingAttribute,
          },
        ]),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new ProductTypeService(
        mockProductTypeOperations,
        attributeService
      );

      // When
      await service.bootstrapProductType({
        name: existingProductType.name,
        attributes: [existingAttribute],
      });

      // Then
      expect(
        mockProductTypeOperations.createProductType
      ).not.toHaveBeenCalled();
    });
  });
});
