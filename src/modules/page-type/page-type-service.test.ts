import { describe, expect, it, vi } from "vitest";
import { AttributeCache } from "../attribute/attribute-cache";
import { AttributeService } from "../attribute/attribute-service";
import type { AttributeInput } from "../config/schema/attribute.schema";
import { PageTypeAttributeValidationError } from "./errors";
import { PageTypeService } from "./page-type-service";

vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

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

  describe("REFERENCE attribute validation", () => {
    it("should throw validation error when REFERENCE attribute is missing entityType", async () => {
      // Given
      const existingPageType = {
        id: "page-type-1",
        name: "Property",
        attributes: [],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn(),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      // Intentionally invalid input to test runtime validation
      const inputAttributes = [
        {
          name: "Products Reference",
          inputType: "REFERENCE",
          // Missing entityType - should cause validation error
        },
      ] as AttributeInput[];

      // When/Then
      await expect(
        service.bootstrapPageType({
          name: "Property",
          attributes: inputAttributes,
        })
      ).rejects.toThrow(PageTypeAttributeValidationError);

      await expect(
        service.bootstrapPageType({
          name: "Property",
          attributes: inputAttributes,
        })
      ).rejects.toThrow(
        /Attribute "Products Reference" is a REFERENCE type but missing required 'entityType'/
      );
    });

    it("should not throw validation error when REFERENCE attribute has entityType", async () => {
      // Given
      const existingPageType = {
        id: "page-type-1",
        name: "Property",
        attributes: [],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn().mockResolvedValue({ id: "attr-1" }),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const inputAttributes: AttributeInput[] = [
        {
          name: "Products Reference",
          inputType: "REFERENCE",
          entityType: "PRODUCT", // Has entityType - should not throw
        },
      ];

      // When/Then - should not throw
      await expect(
        service.bootstrapPageType({
          name: "Property",
          attributes: inputAttributes,
        })
      ).resolves.not.toThrow();
    });
  });

  describe("cache-first attribute resolution", () => {
    it("should use cache for content attribute resolution when cache is provided", async () => {
      // Given: a page type with no existing attributes
      const existingPageType = {
        id: "page-type-1",
        name: "Blog Post",
        attributes: [],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
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

      // Populate cache with content attributes
      const cache = new AttributeCache();
      cache.populateContentAttributes([
        { id: "cached-attr-1", name: "SEO Title", slug: "seo-title", inputType: "PLAIN_TEXT" },
      ]);

      const inputAttributes: AttributeInput[] = [
        { attribute: "SEO Title" }, // Reference to cached attribute
      ];

      // When
      await service.bootstrapPageType(
        { name: "Blog Post", attributes: inputAttributes },
        { attributeCache: cache }
      );

      // Then: should NOT call getAttributesByNames because it was resolved from cache
      expect(mockAttributeOperations.getAttributesByNames).not.toHaveBeenCalled();

      // And: should assign the cached attribute ID
      expect(mockPageTypeOperations.assignAttributes).toHaveBeenCalledWith(
        "page-type-1",
        ["cached-attr-1"]
      );
    });

    it("should fall back to API when attribute is not in cache", async () => {
      // Given: a page type with no existing attributes
      const existingPageType = {
        id: "page-type-2",
        name: "Article",
        attributes: [],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue([
          { id: "api-attr-1", name: "Author", type: "PAGE_TYPE", inputType: "PLAIN_TEXT" },
        ]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      // Populate cache WITHOUT the referenced attribute
      const cache = new AttributeCache();
      cache.populateContentAttributes([
        { id: "other-attr", name: "Other Attribute", slug: "other", inputType: "DROPDOWN" },
      ]);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Author" }, // Not in cache - should fall back to API
      ];

      // When
      await service.bootstrapPageType(
        { name: "Article", attributes: inputAttributes },
        { attributeCache: cache }
      );

      // Then: should call getAttributesByNames for the cache miss
      expect(mockAttributeOperations.getAttributesByNames).toHaveBeenCalledWith({
        names: ["Author"],
        type: "PAGE_TYPE",
      });

      // And: should assign the API-resolved attribute ID
      expect(mockPageTypeOperations.assignAttributes).toHaveBeenCalledWith(
        "page-type-2",
        ["api-attr-1"]
      );
    });

    it("should log warning when API returns null for attribute resolution", async () => {
      const { logger } = await import("../../lib/logger");

      // Given: a page type with no existing attributes
      const existingPageType = {
        id: "page-type-3",
        name: "Landing Page",
        attributes: [],
      };

      const mockPageTypeOperations = {
        getPageTypeByName: vi.fn().mockResolvedValue(existingPageType),
        createPageType: vi.fn(),
        getPageType: vi.fn().mockResolvedValue(existingPageType),
        assignAttributes: vi.fn(),
      };

      const mockAttributeOperations = {
        createAttribute: vi.fn(),
        getAttributesByNames: vi.fn().mockResolvedValue(null),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      // No cache provided - forces API fallback which returns null
      const inputAttributes: AttributeInput[] = [
        { attribute: "Missing Attribute" },
      ];

      // When
      await service.bootstrapPageType(
        { name: "Landing Page", attributes: inputAttributes },
      );

      // Then: should log a warning about null API result
      expect(logger.warn).toHaveBeenCalledWith(
        "API returned no results for content attribute resolution",
        expect.objectContaining({
          attributeNames: ["Missing Attribute"],
        })
      );
    });
  });

});
