import { describe, expect, it, vi } from "vitest";
import type { ChannelService } from "../channel/channel-service";
import type { CollectionInput } from "../config/schema/schema";
import type { ProductService } from "../product/product-service";
import { CollectionService } from "./collection-service";
import { CollectionValidationError } from "./errors";
import type { Collection, CollectionOperations } from "./repository";

describe("CollectionService", () => {
  const mockCollectionInput: CollectionInput = {
    name: "Test Collection",
    slug: "test-collection",
    description:
      '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test description"}}], "version": "2.24.3"}',
    products: ["product-1", "product-2"],
    channelListings: [
      {
        channelSlug: "default-channel",
        isPublished: true,
        publishedAt: "2024-12-22T00:00:00+00:00",
      },
    ],
  };

  const mockCollection: Collection = {
    id: "1",
    name: "Test Collection",
    slug: "test-collection",
    description:
      '{"time": 1234567890, "blocks": [{"id": "block1", "type": "paragraph", "data": {"text": "Test description"}}], "version": "2.24.3"}',
    backgroundImage: null,
    products: {
      edges: [{ node: { id: "p1", slug: "product-1", name: "Product 1" } }, { node: { id: "p2", slug: "product-2", name: "Product 2" } }],
    },
    channelListings: [
      {
        id: "cl1",
        channel: { id: "c1", slug: "default-channel", name: "Default Channel" },
        isPublished: true,
        publishedAt: "2024-12-22T00:00:00+00:00",
      },
    ],
  };

  describe("validateCollectionInput", () => {
    it("should throw error when collection name is missing", async () => {
      const invalidInput = { ...mockCollectionInput, name: "" };
      const mockOperations = createMockOperations();
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      await expect(service.createCollection(invalidInput)).rejects.toThrow(
        CollectionValidationError
      );
    });

    it("should throw error when collection slug is missing", async () => {
      const invalidInput = { ...mockCollectionInput, slug: "" };
      const mockOperations = createMockOperations();
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      await expect(service.createCollection(invalidInput)).rejects.toThrow(
        CollectionValidationError
      );
    });

    it("should accept valid collection input", async () => {
      const mockOperations = createMockOperations();
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.createCollection(mockCollectionInput);
      expect(result).toBeDefined();
      expect(mockOperations.createCollection).toHaveBeenCalled();
    });
  });

  describe("getOrCreateCollection", () => {
    it("should not create a collection that already exists", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getCollectionBySlug.mockResolvedValue(mockCollection); // Mock the direct lookup
      mockOperations.updateCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.getOrCreateCollection(mockCollectionInput);

      expect(mockOperations.createCollection).not.toHaveBeenCalled();
      expect(mockOperations.updateCollection).toHaveBeenCalled();
      expect(result).toEqual(mockCollection);
    });

    it("should create a new collection when it doesn't exist", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getCollectionBySlug.mockResolvedValue(null); // Collection doesn't exist
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.getOrCreateCollection(mockCollectionInput);

      expect(mockOperations.createCollection).toHaveBeenCalled();
      expect(result).toEqual(mockCollection);
    });
  });

  describe("bootstrapCollections", () => {
    it("should validate unique slugs", async () => {
      const duplicateCollections = [
        mockCollectionInput,
        { ...mockCollectionInput, name: "Another Collection" },
      ];

      const mockOperations = createMockOperations();
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      await expect(service.bootstrapCollections(duplicateCollections)).rejects.toThrow(
        CollectionValidationError
      );
    });

    it("should process multiple collections successfully", async () => {
      const collections = [
        mockCollectionInput,
        { ...mockCollectionInput, slug: "second-collection", name: "Second Collection" },
      ];

      const mockOperations = createMockOperations();
      mockOperations.getCollections.mockResolvedValue([]);
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const results = await service.bootstrapCollections(collections);

      expect(mockOperations.createCollection).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe("channel listings", () => {
    it("should handle collections without channel listings", async () => {
      const inputWithoutChannels = { ...mockCollectionInput, channelListings: undefined };
      const mockOperations = createMockOperations();
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.createCollection(inputWithoutChannels);
      expect(result).toBeDefined();
      expect(mockOperations.createCollection).toHaveBeenCalled();
    });

    it("should handle collections with multiple channel listings", async () => {
      const inputWithMultipleChannels = {
        ...mockCollectionInput,
        channelListings: [
          {
            channelSlug: "default-channel",
            isPublished: true,
            publishedAt: "2024-12-22T00:00:00+00:00",
          },
          { channelSlug: "eu", isPublished: false, publishedAt: "2024-12-22T00:00:00+00:00" },
        ],
      };
      const mockOperations = createMockOperations();
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.createCollection(inputWithMultipleChannels);
      expect(result).toBeDefined();
      expect(mockOperations.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Collection",
          slug: "test-collection",
          description: expect.any(String),
          products: [], // Products handled separately
        })
      );
      expect(mockOperations.updateChannelListings).toHaveBeenCalled();
    });
  });

  describe("product assignment", () => {
    it("should handle collections without products", async () => {
      const inputWithoutProducts = { ...mockCollectionInput, products: undefined };
      const mockOperations = createMockOperations();
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.createCollection(inputWithoutProducts);
      expect(result).toBeDefined();
      expect(mockOperations.createCollection).toHaveBeenCalled();
    });

    it("should handle collections with product assignments", async () => {
      const mockOperations = createMockOperations();
      mockOperations.createCollection.mockResolvedValue(mockCollection);
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      const result = await service.createCollection(mockCollectionInput);
      expect(result).toBeDefined();
      expect(mockOperations.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Collection",
          slug: "test-collection",
          description: expect.any(String),
          products: [], // Products handled separately
        })
      );
      expect(mockOperations.assignProducts).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw CollectionOperationError on create failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getCollections.mockResolvedValue([]);
      mockOperations.createCollection.mockRejectedValue(new Error("API Error"));
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      await expect(service.createCollection(mockCollectionInput)).rejects.toThrow(
        /Failed to create collection.*API Error/
      );
    });

    it("should throw CollectionOperationError on update failure", async () => {
      const mockOperations = createMockOperations();
      mockOperations.getCollections.mockResolvedValue([]);
      mockOperations.updateCollection.mockRejectedValue(new Error("API Error"));
      const mockProductService = {
        getProductBySlug: vi.fn().mockResolvedValue({ id: "p1", slug: "product-1" }),
      } as unknown as ProductService;
      const mockChannelService = {
        getChannelBySlug: vi.fn().mockResolvedValue({ id: "c1", slug: "default-channel" }),
      } as unknown as ChannelService;
      const service = new CollectionService(mockOperations, mockProductService, mockChannelService);

      await expect(service.updateCollection("1", mockCollectionInput)).rejects.toThrow(
        /Failed to update collection.*API Error/
      );
    });
  });
});

function createMockOperations(): CollectionOperations & {
  [K in keyof CollectionOperations]: ReturnType<typeof vi.fn>;
} {
  return {
    getCollections: vi.fn(),
    getCollectionBySlug: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    assignProducts: vi.fn(),
    removeProducts: vi.fn(),
    updateChannelListings: vi.fn(),
  };
}
