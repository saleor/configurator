import { describe, expect, it, vi } from "vitest";
import { AttributeService } from "./attribute-service";
import type { Attribute, AttributeCreateInput } from "./repository";

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
        createAttribute: vi.fn().mockResolvedValue({
          id: "1",
          ...existingAttribute,
          choices: { edges: [{ node: { name: "Red" } }] },
        }),
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
          edges: [
            { node: { name: "Fiction" } },
            { node: { name: "Non-Fiction" } },
          ],
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
          edges: [
            { node: { name: "Fiction" } },
            { node: { name: "Non-Fiction" } },
          ],
        },
      };

      const sameAttributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        values: [
          { name: "Fiction" },
          { name: "Non-Fiction" },
        ],
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

  describe("createAttributeInput", () => {
    it("should create correct input for dropdown attributes with values", () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };
      const service = new AttributeService(mockOperations);

      const attributeInput = {
        name: "Genre",
        inputType: "DROPDOWN" as const,
        type: "PRODUCT_TYPE" as const,
        values: [
          { name: "Fiction" },
          { name: "Non-Fiction" },
          { name: "Fantasy" },
        ],
      };

      // When creating the attribute, verify the GraphQL input structure
      service.bootstrapAttributes({ attributeInputs: [attributeInput] });

      // Then - verify the createAttribute was called with correct GraphQL structure
      expect(mockOperations.createAttribute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Genre",
          type: "PRODUCT_TYPE",
          slug: "genre",
          inputType: "DROPDOWN",
          values: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              // Should NOT have 'value' field for regular dropdowns (only for swatch)
            }),
          ]),
        })
      );
    });

    it("should create correct input for plain text attributes", () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };
      const service = new AttributeService(mockOperations);

      const attributeInput = {
        name: "Author",
        inputType: "PLAIN_TEXT" as const,
        type: "PRODUCT_TYPE" as const,
      };

      // When
      service.bootstrapAttributes({ attributeInputs: [attributeInput] });

      // Then
      expect(mockOperations.createAttribute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Author",
          type: "PRODUCT_TYPE",
          slug: "author",
          inputType: "PLAIN_TEXT",
          // Should not have values field for plain text
        })
      );
      
      const createCall = mockOperations.createAttribute.mock.calls[0][0];
      expect(createCall).not.toHaveProperty('values');
    });

    it("should create correct input for reference attributes", () => {
      // Given
      const mockOperations = {
        createAttribute: vi.fn(),
        updateAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
      };
      const service = new AttributeService(mockOperations);

      const attributeInput = {
        name: "Related Posts",
        inputType: "REFERENCE" as const,
        type: "PAGE_TYPE" as const,
        entityType: "PAGE" as const,
      };

      // When
      service.bootstrapAttributes({ attributeInputs: [attributeInput] });

      // Then
      expect(mockOperations.createAttribute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Related Posts",
          type: "PAGE_TYPE",
          slug: "related-posts",
          inputType: "REFERENCE",
          entityType: "PAGE",
        })
      );
    });
  });
});
