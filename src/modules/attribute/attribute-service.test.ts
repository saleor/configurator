import { describe, expect, it, vi } from "vitest";
import type { AttributeInput } from "../config/schema/attribute.schema";
import { AttributeService } from "./attribute-service";
import type { Attribute } from "./repository";

describe("AttributeService", () => {
  describe("bootstrapAttributes", () => {
    it("should create an attribute that already exists", async () => {
      // Given
      const existingAttribute = {
        name: "Color",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Red" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
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
      expect(mockOperations.createAttribute).toHaveBeenCalled();
    });
  });

  describe("resolveReferencedAttributes", () => {
    it("should resolve referenced attributes for product types", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "attr-1",
            name: "Author",
            type: "PRODUCT_TYPE",
            inputType: "PLAIN_TEXT",
          },
        ]),
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Author" }, // Reference to existing attribute
        { name: "New Attribute", inputType: "PLAIN_TEXT" }, // New attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual(["attr-1"]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Author"],
        type: "PRODUCT_TYPE",
      });
    });

    it("should resolve referenced attributes for page types", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          {
            id: "attr-2",
            name: "Published Date",
            type: "PAGE_TYPE",
            inputType: "DATE",
          },
        ]),
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Published Date" }, // Reference to existing attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PAGE_TYPE");

      // Then
      expect(result).toEqual(["attr-2"]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Published Date"],
        type: "PAGE_TYPE",
      });
    });

    it("should filter out already assigned attributes", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]), // Should not be called
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Author" }, // Already assigned
        { attribute: "Genre" }, // Not assigned
      ];

      const existingAttributeNames = ["Author"]; // Author is already assigned

      // When
      const result = await service.resolveReferencedAttributes(
        inputAttributes,
        "PRODUCT_TYPE",
        existingAttributeNames
      );

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Genre"], // Only Genre should be looked up
        type: "PRODUCT_TYPE",
      });
    });

    it("should return empty array when no referenced attributes", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(), // Should not be called
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { name: "New Attribute", inputType: "PLAIN_TEXT" }, // No references
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).not.toHaveBeenCalled();
    });

    it("should handle case when referenced attributes are not found", async () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([]), // No attributes found
      };

      const service = new AttributeService(mockOperations);

      const inputAttributes: AttributeInput[] = [
        { attribute: "NonExistent" }, // Reference to non-existent attribute
      ];

      // When
      const result = await service.resolveReferencedAttributes(inputAttributes, "PRODUCT_TYPE");

      // Then
      expect(result).toEqual([]);
      expect(mockOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["NonExistent"],
        type: "PRODUCT_TYPE",
      });
    });
  });

  describe("updateAttribute", () => {
    it("should update attribute with new values", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }, { node: { name: "Non-Fiction" } }],
        },
      };

      const updatedAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [
          { name: "Fiction" },
          { name: "Non-Fiction" },
          { name: "Romance" }, // New value
        ],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn().mockResolvedValue({
          ...existingAttribute,
          choices: {
            edges: [
              { node: { name: "Fiction" } },
              { node: { name: "Non-Fiction" } },
              { node: { name: "Romance" } },
            ],
          },
        }),
        getAttributesByNames: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      // When
      const result = await service.updateAttribute(updatedAttributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).toHaveBeenCalledWith("attr-1", {
        name: "Genre",
        addValues: [{ name: "Romance" }],
      });
      expect(result.choices?.edges).toHaveLength(3);
    });

    it("should not update attribute when no new values", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Genre",
        type: "PRODUCT_TYPE",
        inputType: "DROPDOWN",
        entityType: null,
        choices: {
          edges: [{ node: { name: "Fiction" } }, { node: { name: "Non-Fiction" } }],
        },
      };

      const sameAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [{ name: "Fiction" }, { name: "Non-Fiction" }],
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      // When
      const result = await service.updateAttribute(sameAttributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should not update plain text attributes", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Author",
        type: "PRODUCT_TYPE",
        inputType: "PLAIN_TEXT",
        entityType: null,
        choices: null,
      };

      const attributeInput = {
        name: "Author",
        inputType: "PLAIN_TEXT" as const,
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      // When
      const result = await service.updateAttribute(attributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });

    it("should handle reference attributes without updates", async () => {
      // Given
      const existingAttribute: Attribute = {
        id: "attr-1",
        name: "Related Books",
        type: "PRODUCT_TYPE",
        inputType: "REFERENCE",
        entityType: "PRODUCT",
        choices: null,
      };

      const attributeInput = {
        name: "Related Books",
        inputType: "REFERENCE" as const,
        entityType: "PRODUCT" as const,
        type: "PRODUCT_TYPE" as const,
      };

      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };

      const service = new AttributeService(mockOperations);

      // When
      const result = await service.updateAttribute(attributeInput, existingAttribute);

      // Then
      expect(mockOperations.updateAttribute).not.toHaveBeenCalled();
      expect(result).toBe(existingAttribute);
    });
  });
});
