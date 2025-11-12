import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "../attribute/attribute-service";
import type { AttributeInput } from "../config/schema/attribute.schema";
import { PageTypeService } from "./page-type-service";

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
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      // When
      await service.bootstrapPageType({
        name: existingPageType.name,
        attributes: [existingAttribute],
      });

      // Then
      expect(mockPageTypeOperations.createPageType).not.toHaveBeenCalled();
    });
  });

  describe("reference attributes", () => {
    it("should handle reference attributes correctly", async () => {
      // Given
      const existingPageType = {
        id: "page-type-1",
        name: "Blog Post",
        attributes: [], // No existing attributes
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue({ id: "attr-3" }),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "attr-1",
            name: "Published Date",
            type: "PAGE_TYPE",
            inputType: "DATE",
          },
        ]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Published Date" }, // Reference to existing attribute
        {
          name: "Tags",
          inputType: "DROPDOWN",
          values: [{ name: "Technology" }],
        }, // New attribute
      ];

      // When
      await service.bootstrapPageType({
        name: "Blog Post",
        attributes: inputAttributes,
      });

      // Then
      expect(mockAttributeOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Published Date"],
        type: "PAGE_TYPE",
      });
      expect(mockPageTypeOperations.assignAttributes).toHaveBeenCalledWith(
        "page-type-1",
        expect.arrayContaining(["attr-1", "attr-3"]) // Should include the referenced attribute ID and the new one
      );
    });

    it("should not assign already assigned reference attributes", async () => {
      // Given
      const existingPageType = {
        id: "page-type-1",
        name: "Blog Post",
        attributes: [
          { id: "attr-1", name: "Published Date" }, // Already assigned
        ],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]), // Should not be called for already assigned
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);

      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Published Date" }, // Already assigned
      ];

      // When
      await service.bootstrapPageType({
        name: "Blog Post",
        attributes: inputAttributes,
      });

      // Then
      expect(mockAttributeOperations.getAttributesByNames).not.toHaveBeenCalled();
      expect(mockPageTypeOperations.assignAttributes).not.toHaveBeenCalled();
    });
  });
});
