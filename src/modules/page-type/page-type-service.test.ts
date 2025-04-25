import { describe, expect, it, vi } from "vitest";
import { PageTypeService } from "./page-type-service";
import { AttributeService } from "../attribute/attribute-service";

describe("PageTypeService", () => {
  describe("is idempotent", () => {
    it("should not create a page type that already exists", async () => {
      const existingAttribute = {
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
        type: "PAGE_TYPE" as const,
      };

      const existingPageType = {
        name: "Page Type 1",
        attributes: [existingAttribute],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn(),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
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
