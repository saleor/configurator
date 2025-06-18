import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "./attribute-service";

describe("AttributeService", () => {
  describe("is idempotent", () => {
    it("should not create an attribute that already exists", async () => {
      // Given
      const existingAttribute = {
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "1",
            ...existingAttribute,
          },
        ]),
        getAttributeByName: vi.fn(),
        getAttributeBySlug: vi.fn().mockResolvedValue({
          id: "1",
          name: "Color",
          type: "PRODUCT_TYPE",
          inputType: "DROPDOWN",
        }),
      };

      const service = new AttributeService(mockOperations);

      // When
      await service.bootstrapAttributes({
        attributeInputs: [existingAttribute],
      });

      // Then
      expect(mockOperations.createAttribute).not.toHaveBeenCalled();
      expect(mockOperations.getAttributeBySlug).toHaveBeenCalledWith(
        "color", 
        "PRODUCT_TYPE"
      );
    });

    it("should create an attribute that does not exist", async () => {
      // Given
      const newAttribute = {
        name: "Size",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Small" }, { name: "Large" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn().mockResolvedValue({
          id: "2",
          name: "Size",
          type: "PRODUCT_TYPE",
          inputType: "DROPDOWN",
        }),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        getAttributeByName: vi.fn(),
        getAttributeBySlug: vi.fn().mockResolvedValue(null),
      };

      const service = new AttributeService(mockOperations);

      // When
      await service.bootstrapAttributes({
        attributeInputs: [newAttribute],
      });

      // Then
      expect(mockOperations.getAttributeBySlug).toHaveBeenCalledWith(
        "size", 
        "PRODUCT_TYPE"
      );
      expect(mockOperations.createAttribute).toHaveBeenCalledWith({
        name: "Size",
        type: "PRODUCT_TYPE",
        slug: "size",
        inputType: "DROPDOWN",
        values: [{ name: "Small" }, { name: "Large" }],
      });
    });
  });
});
