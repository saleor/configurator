import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AttributeInput } from "../config/schema/attribute.schema";
import { ProductTypeService } from "../product-type/product-type-service";
import type {
  ProductType,
  ProductTypeOperations,
} from "../product-type/repository";
import type { AttributeService } from "./attribute-service";
import { DuplicateAttributeDefinitionError } from "./errors";
import type { Attribute } from "./repository";

describe("Attribute Duplicate Handling", () => {
  let productTypeService: ProductTypeService;
  let mockRepository: ProductTypeOperations;
  let mockAttributeService: AttributeService;
  let mockProductType: ProductType;

  beforeEach(() => {
    mockRepository = {
      getProductTypeByName: vi.fn(),
      createProductType: vi.fn(),
      assignAttributesToProductType: vi.fn(),
    } as unknown as ProductTypeOperations;

    mockAttributeService = {
      repo: {
        getAttributesByNames: vi.fn(),
        createAttribute: vi.fn(),
      },
      bootstrapAttributes: vi.fn(),
      updateAttribute: vi.fn(),
    } as unknown as AttributeService;

    mockProductType = {
      id: "test-id",
      name: "Test Product Type",
      productAttributes: [],
      variantAttributes: [],
    } as ProductType;

    productTypeService = new ProductTypeService(
      mockRepository,
      mockAttributeService
    );
  });

  describe("duplicate attribute definition handling", () => {
    it("should throw error when attempting to define an attribute that already exists", async () => {
      const existingAttribute: Attribute = {
        id: "existing-attr-id",
        name: "Color",
        inputType: "DROPDOWN",
        choices: {
          edges: [{ node: { name: "Red" } }, { node: { name: "Blue" } }],
        },
      } as Attribute;

      // Mock that the attribute already exists globally
      vi.mocked(
        mockAttributeService.repo.getAttributesByNames
      ).mockResolvedValue([existingAttribute]);

      const inputAttributes: AttributeInput[] = [
        {
          name: "Color", // This attribute already exists
          inputType: "DROPDOWN" as const,
          values: [{ name: "Red" }, { name: "Blue" }, { name: "Green" }],
        },
      ];

      await expect(
        productTypeService.updateProductType(mockProductType, {
          name: "Test Product Type",
          productAttributes: inputAttributes,
        })
      ).rejects.toThrow(DuplicateAttributeDefinitionError);
    });

    it("should allow creating attribute when it doesn't exist globally", async () => {
      // Mock that the attribute doesn't exist globally
      vi.mocked(
        mockAttributeService.repo.getAttributesByNames
      ).mockResolvedValue([]);
      vi.mocked(mockAttributeService.bootstrapAttributes).mockResolvedValue([
        {
          id: "new-attr-id",
          name: "Color",
          inputType: "DROPDOWN",
        } as Attribute,
      ]);

      const inputAttributes: AttributeInput[] = [
        {
          name: "Color", // This attribute doesn't exist yet
          inputType: "DROPDOWN" as const,
          values: [{ name: "Red" }, { name: "Blue" }],
        },
      ];

      await expect(
        productTypeService.updateProductType(mockProductType, {
          name: "Test Product Type",
          productAttributes: inputAttributes,
        })
      ).resolves.not.toThrow();
    });

    it("should suggest using reference syntax in error message", async () => {
      const existingAttribute: Attribute = {
        id: "existing-attr-id",
        name: "Size",
        inputType: "DROPDOWN",
      } as Attribute;

      vi.mocked(
        mockAttributeService.repo.getAttributesByNames
      ).mockResolvedValue([existingAttribute]);

      const inputAttributes: AttributeInput[] = [
        {
          name: "Size",
          inputType: "DROPDOWN" as const,
          values: [{ name: "S" }, { name: "M" }, { name: "L" }],
        },
      ];

      try {
        await productTypeService.updateProductType(mockProductType, {
          name: "Test Product Type",
          productAttributes: inputAttributes,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateAttributeDefinitionError);
        expect(error.message).toContain(
          'Use reference syntax instead: "attribute: Size"'
        );
        expect(error.message).toContain(
          "This encourages reuse and prevents conflicts"
        );
      }
    });
  });
});
