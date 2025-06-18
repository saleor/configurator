import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionService } from "./collection-service";
import type { CollectionOperations, Collection } from "./repository";
import type { ChannelService } from "../channel/channel-service";

describe("CollectionService", () => {
  let service: CollectionService;
  let mockRepository: CollectionOperations;
  let mockChannelService: ChannelService;

  beforeEach(() => {
    mockRepository = {
      createCollection: vi.fn(),
      updateCollection: vi.fn(),
      getCollectionBySlug: vi.fn(),
      addProductsToCollection: vi.fn(),
      removeProductsFromCollection: vi.fn(),
      updateCollectionChannelListings: vi.fn(),
    };
    
    mockChannelService = {
      getAllChannels: vi.fn().mockResolvedValue([
        { id: "channel-1", slug: "default", name: "Default" },
        { id: "channel-2", slug: "mobile", name: "Mobile" },
      ]),
    } as any;

    service = new CollectionService(mockRepository, mockChannelService);
  });

  describe("upsertCollections", () => {
    it("should create collection when it doesn't exist", async () => {
      // Arrange
      const collectionInput = {
        name: "Summer Collection",
        slug: "summer-collection",
        description: "Best products for summer",
        isPublished: true,
        channelListings: [
          { channelSlug: "default", isPublished: true },
        ],
      };

      const createdCollection: Collection = {
        id: "1",
        name: "Summer Collection",
        slug: "summer-collection",
        description: "Best products for summer",
      };

      vi.mocked(mockRepository.getCollectionBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createCollection).mockResolvedValue(createdCollection);
      vi.mocked(mockRepository.updateCollectionChannelListings).mockResolvedValue(createdCollection);

      // Act
      await service.upsertCollections([collectionInput]);

      // Assert
      expect(mockRepository.getCollectionBySlug).toHaveBeenCalledWith("summer-collection", "default");
      expect(mockRepository.createCollection).toHaveBeenCalledWith({
        name: "Summer Collection",
        slug: "summer-collection",
        description: "Best products for summer",
        isPublished: true,
      });
      expect(mockRepository.updateCollectionChannelListings).toHaveBeenCalledWith("1", {
        addChannels: [
          { channelId: "channel-1", isPublished: true, publishedAt: undefined },
        ],
        removeChannels: undefined,
      });
    });

    it("should update collection when it exists", async () => {
      // Arrange
      const collectionInput = {
        name: "Updated Summer Collection",
        slug: "summer-collection",
        description: "Updated description",
        channelListings: [
          { channelSlug: "default", isPublished: true },
          { channelSlug: "mobile", isPublished: false },
        ],
      };

      const existingCollection: Collection = {
        id: "1",
        name: "Summer Collection",
        slug: "summer-collection",
        description: "Best products for summer",
      };

      vi.mocked(mockRepository.getCollectionBySlug).mockResolvedValue(existingCollection);
      vi.mocked(mockRepository.updateCollection).mockResolvedValue({
        ...existingCollection,
        name: "Updated Summer Collection",
        description: "Updated description",
      });
      vi.mocked(mockRepository.updateCollectionChannelListings).mockResolvedValue(existingCollection);

      // Act
      await service.upsertCollections([collectionInput]);

      // Assert
      expect(mockRepository.getCollectionBySlug).toHaveBeenCalledWith("summer-collection", "default");
      expect(mockRepository.updateCollection).toHaveBeenCalledWith("1", {
        name: "Updated Summer Collection",
        description: "Updated description",
        isPublished: true,
      });
      expect(mockRepository.updateCollectionChannelListings).toHaveBeenCalledWith("1", {
        addChannels: [
          { channelId: "channel-1", isPublished: true, publishedAt: undefined },
        ],
        removeChannels: ["channel-2"],
      });
    });

    it("should handle collections without channel listings", async () => {
      // Arrange
      const collectionInput = {
        name: "Basic Collection",
        slug: "basic-collection",
      };

      const createdCollection: Collection = {
        id: "1",
        name: "Basic Collection",
        slug: "basic-collection",
      };

      vi.mocked(mockRepository.getCollectionBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createCollection).mockResolvedValue(createdCollection);

      // Act
      await service.upsertCollections([collectionInput]);

      // Assert
      expect(mockRepository.createCollection).toHaveBeenCalledWith({
        name: "Basic Collection",
        slug: "basic-collection",
        description: undefined,
        isPublished: true,
      });
      expect(mockRepository.updateCollectionChannelListings).not.toHaveBeenCalled();
    });

    it("should throw error if channel not found", async () => {
      // Arrange
      const collectionInput = {
        name: "Collection",
        slug: "collection",
        channelListings: [
          { channelSlug: "non-existent", isPublished: true },
        ],
      };

      const createdCollection: Collection = {
        id: "1",
        name: "Collection",
        slug: "collection",
      };

      vi.mocked(mockRepository.getCollectionBySlug).mockResolvedValue(null);
      vi.mocked(mockRepository.createCollection).mockResolvedValue(createdCollection);

      // Act & Assert
      await expect(service.upsertCollections([collectionInput])).rejects.toThrow(
        "Channel not found: non-existent"
      );
    });
  });
}); 