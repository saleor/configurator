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
      };

      const service = new AttributeService(mockOperations);

      // When
      await service.bootstrapAttributes({
        attributeInputs: [existingAttribute],
      });

      // Then
      expect(mockOperations.createAttribute).not.toHaveBeenCalled();
    });
  });
});
