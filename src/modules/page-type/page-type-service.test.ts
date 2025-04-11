import { describe, expect, it, vi } from "vitest";
import { PageTypeService } from "./page-type-service";
import { AttributeService } from "../attribute/attribute-service";

describe("PageTypeService", () => {
  describe("is idempotent", () => {
    it("should not create a page type that already exists", async () => {
      const existingPageType = {
        name: "Page Type 1",
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn(),
        assignAttributes: vi.fn(),
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

      const service = new PageTypeService(
        mockPageTypeOperations,
        attributeService
      );

      // When
      await service.bootstrapPageType({
        name: existingPageType.name,
        attributes: [existingAttribute],
      });

      // Then
      expect(mockPageTypeOperations.createPageType).not.toHaveBeenCalled();
    });
  });
});
