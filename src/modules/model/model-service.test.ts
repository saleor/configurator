import { describe, expect, it, vi } from "vitest";
import type { ModelInput } from "../config/schema/schema";
import { ModelValidationError } from "./errors";
import type { Model, ModelOperations } from "./repository";
import { ModelService } from "./model-service";

// Mock service interfaces for testing
interface MockPageTypeService {
  getPageTypeByName: (name: string) => Promise<{ id: string; name: string } | null | undefined>;
  getPageType?: (id: string) => Promise<{ id: string; name: string; attributes: unknown[] } | null | undefined>;
}

interface MockAttributeService {
  processModelAttributes: (attributes: unknown[]) => Promise<unknown[]>;
}

describe("ModelService", () => {
  const mockModelInput: ModelInput = {
    title: "Test Model",
    slug: "test-model",
    content: '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test content"}}], "version": "2.24.3"}',
    isPublished: true,
    publishedAt: "2024-12-22T00:00:00+00:00",
    modelType: "Simple",
    attributes: {},
  };

  const mockModel: Model = {
    id: "1",
    title: "Test Model",
    slug: "test-model",
    content: '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test content"}}], "version": "2.24.3"}',
    isPublished: true,
    publishedAt: "2024-12-22T00:00:00+00:00",
    pageType: {
      id: "simple-type-id",
      name: "Simple",
    },
    attributes: [],
  };

  describe("validateModelInput", () => {
    it("should throw error when model title is missing", async () => {
      const invalidInput = { ...mockModelInput, title: "" };
      const mockOperations = createMockOperations();
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue(null),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.createModel(invalidInput)).rejects.toThrow(ModelValidationError);
    });

    it("should throw error when model slug is missing", async () => {
      const invalidInput = { ...mockModelInput, slug: "" };
      const mockOperations = createMockOperations();
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue(null),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.createModel(invalidInput)).rejects.toThrow(ModelValidationError);
    });

    it("should throw error when model type is missing", async () => {
      const invalidInput = { ...mockModelInput, modelType: "" };
      const mockOperations = createMockOperations();
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue(null),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.createModel(invalidInput)).rejects.toThrow(ModelValidationError);
    });

    it("should accept valid model input", async () => {
      const mockOperations = createMockOperations();
      mockOperations.createPage.mockResolvedValue(mockModel);
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const result = await service.createModel(mockModelInput);
      expect(result).toBeDefined();
      expect(mockOperations.createPage).toHaveBeenCalled();
    });
  });

  describe("getOrCreateModel", () => {
    it("should not create a model that already exists", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getPageBySlug.mockResolvedValue(mockModel); // Mock the direct lookup
      mockOperations.updatePage.mockResolvedValue(mockModel);
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const result = await service.getOrCreateModel(mockModelInput);

      expect(mockOperations.createPage).not.toHaveBeenCalled();
      expect(mockOperations.updatePage).toHaveBeenCalled();
      expect(result).toEqual(mockModel);
    });

    it("should create a new model when it doesn't exist", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getPageBySlug.mockResolvedValue(null); // Model doesn't exist
      mockOperations.createPage.mockResolvedValue(mockModel);
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const result = await service.getOrCreateModel(mockModelInput);

      expect(mockOperations.createPage).toHaveBeenCalled();
      expect(result).toEqual(mockModel);
    });
  });

  describe("bootstrapModels", () => {
    it("should validate unique slugs", async () => {
      const duplicateModels = [
        mockModelInput,
        { ...mockModelInput, title: "Another Model" },
      ];

      const mockOperations = createMockOperations();
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue(null),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.bootstrapModels(duplicateModels)).rejects.toThrow(
        ModelValidationError
      );
    });

    it("should process multiple models successfully", async () => {
      const models = [
        mockModelInput,
        { ...mockModelInput, slug: "second-model", title: "Second Model" },
      ];

      const mockOperations = createMockOperations();
      mockOperations.getPages.mockResolvedValue([]);
      mockOperations.createPage.mockResolvedValue(mockModel);
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const results = await service.bootstrapModels(models);

      expect(mockOperations.createPage).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("error handling", () => {
    it("should throw ModelOperationError on create failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getPages.mockResolvedValue([]);
      mockOperations.createPage.mockRejectedValue(new Error("API Error"));
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.createModel(mockModelInput)).rejects.toThrow(
        /Failed to create model.*API Error/
      );
    });

    it("should throw ModelOperationError on update failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getPages.mockResolvedValue([]);
      mockOperations.updatePage.mockRejectedValue(new Error("API Error"));
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple" }),
        getPageType: vi.fn().mockResolvedValue({ id: "simple-type-id", name: "Simple", attributes: [] }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      await expect(service.updateModel("1", mockModelInput)).rejects.toThrow(
        /Failed to update model.*API Error/
      );
    });
  });

  describe("model type resolution", () => {
    it("should resolve page type by name", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getPages.mockResolvedValue([]);
      mockOperations.createPage.mockResolvedValue(mockModel);
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue({ id: "blog-post-id", name: "Blog Post" }),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const blogPostInput = { ...mockModelInput, modelType: "Blog Post" };
      await service.createModel(blogPostInput);

      expect(mockPageTypeService.getPageTypeByName).toHaveBeenCalledWith("Blog Post");
      expect(mockOperations.createPage).toHaveBeenCalledWith(
        expect.objectContaining({ pageType: "blog-post-id" })
      );
    });

    it("should throw error for unknown page type", async () => {
      const mockOperations = createMockOperations();
      const mockPageTypeService: MockPageTypeService = {
        getPageTypeByName: vi.fn().mockResolvedValue(null),
      };
      const mockAttributeService: MockAttributeService = {
        processModelAttributes: vi.fn().mockResolvedValue([]),
      };
      const service = new ModelService(mockOperations, mockPageTypeService, mockAttributeService);

      const invalidInput = { ...mockModelInput, modelType: "Unknown Type" };

      await expect(service.createModel(invalidInput)).rejects.toThrow(
        /Model type \"Unknown Type\" not found/
      );
    });
  });
});

function createMockOperations(): ModelOperations & { [K in keyof ModelOperations]: ReturnType<typeof vi.fn> } {
  return {
    getPages: vi.fn(),
    getPageBySlug: vi.fn(),
    createPage: vi.fn(),
    updatePage: vi.fn(),
    updatePageAttributes: vi.fn(),
    unassignPageAttributes: vi.fn(),
  };
}