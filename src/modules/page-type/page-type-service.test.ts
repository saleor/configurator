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

      await service.bootstrapPageType({
        name: existingPageType.name,
        attributes: [existingAttribute],
      });

      expect(mockPageTypeOperations.createPageType).not.toHaveBeenCalled();
    });
  });

  describe("reference attributes", () => {
    it("should handle reference attributes correctly", async () => {
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
        createAttribute: vi.fn().mockResolvedValue({ id: "attr-3" }),
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const cache = new AttributeCache();
      cache.populateContentAttributes([
        {
          id: "attr-1",
          name: "Published Date",
          slug: "published-date",
          inputType: "DATE",
          entityType: null,
          choices: [],
        },
      ]);

      const inputAttributes: AttributeInput[] = [
        { attribute: "Published Date" },
        {
          name: "Tags",
          inputType: "DROPDOWN",
          values: [{ name: "Technology" }],
        },
      ];

      await service.bootstrapPageType(
        { name: "Blog Post", attributes: inputAttributes },
        { attributeCache: cache }
      );

      expect(mockPageTypeOperations.assignAttributes).toHaveBeenCalledWith(
        "page-type-1",
        expect.arrayContaining(["attr-1", "attr-3"])
      );
    });

    it("should not assign already assigned reference attributes", async () => {
      const existingPageType = {
        id: "page-type-1",
        name: "Blog Post",
        attributes: [{ id: "attr-1", name: "Published Date" }],
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

      const inputAttributes: AttributeInput[] = [{ attribute: "Published Date" }];

      await service.bootstrapPageType({
        name: "Blog Post",
        attributes: inputAttributes,
      });

      expect(mockAttributeOperations.getAttributesByNames).not.toHaveBeenCalled();
      expect(mockPageTypeOperations.assignAttributes).not.toHaveBeenCalled();
    });
  });

  describe("REFERENCE attribute validation", () => {
    it("should throw validation error when REFERENCE attribute is missing entityType", async () => {
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

      const inputAttributes = [
        {
          name: "Products Reference",
          inputType: "REFERENCE",
        },
      ] as AttributeInput[];

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
          entityType: "PRODUCT",
        },
      ];

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

      const cache = new AttributeCache();
      cache.populateContentAttributes([
        {
          id: "cached-attr-1",
          name: "SEO Title",
          slug: "seo-title",
          inputType: "PLAIN_TEXT",
          entityType: null,
          choices: [],
        },
      ]);

      const inputAttributes: AttributeInput[] = [{ attribute: "SEO Title" }];

      await service.bootstrapPageType(
        { name: "Blog Post", attributes: inputAttributes },
        { attributeCache: cache }
      );

      expect(mockAttributeOperations.getAttributesByNames).not.toHaveBeenCalled();
      expect(mockPageTypeOperations.assignAttributes).toHaveBeenCalledWith("page-type-1", [
        "cached-attr-1",
      ]);
    });

    it("should throw when referenced attribute is not in cache", async () => {
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
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const cache = new AttributeCache();
      cache.populateContentAttributes([
        {
          id: "other-attr",
          name: "Other Attribute",
          slug: "other",
          inputType: "DROPDOWN",
          entityType: null,
          choices: [],
        },
      ]);

      const inputAttributes: AttributeInput[] = [{ attribute: "Author" }];

      await expect(
        service.bootstrapPageType(
          { name: "Article", attributes: inputAttributes },
          { attributeCache: cache }
        )
      ).rejects.toThrow(/does not exist in contentAttributes/);
    });

    it("should throw when no attribute cache is provided", async () => {
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
        getAttributesByNames: vi.fn().mockResolvedValue([]),
        updateAttribute: vi.fn(),
        bulkCreateAttributes: vi.fn(),
        bulkUpdateAttributes: vi.fn(),
      };

      const attributeService = new AttributeService(mockAttributeOperations);
      const service = new PageTypeService(mockPageTypeOperations, attributeService);

      const inputAttributes: AttributeInput[] = [{ attribute: "Missing Attribute" }];

      await expect(
        service.bootstrapPageType({ name: "Landing Page", attributes: inputAttributes })
      ).rejects.toThrow(/without attribute cache/);
    });
  });
});
