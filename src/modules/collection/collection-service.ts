import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { 
  CollectionOperations, 
  Collection, 
  CollectionCreateInput,
  CollectionChannelListingUpdateInput 
} from "./repository";
import type { ChannelService } from "../channel/channel-service";

type CollectionInput = NonNullable<SaleorConfig["collections"]>[number];

export class CollectionService {
  constructor(
    private repository: CollectionOperations,
    private channelService: ChannelService
  ) {}

  async upsertCollections(collections: NonNullable<SaleorConfig["collections"]>) {
    for (const collection of collections) {
      await this.upsertCollection(collection);
    }
  }

  private async upsertCollection(input: CollectionInput) {
    // Try to get collection from first channel
    const channels = await this.channelService.getAllChannels();
    const firstChannel = channels[0];
    
    const existing = await this.repository.getCollectionBySlug(
      input.slug,
      firstChannel?.slug
    );

    let collection: Collection;
    if (existing) {
      collection = await this.updateCollection(existing.id, input);
    } else {
      collection = await this.createCollection(input);
    }

    // Handle channel assignments
    if (input.channelListings && input.channelListings.length > 0) {
      await this.updateChannelListings(collection.id, input.channelListings);
    }
  }

  private async createCollection(input: CollectionInput): Promise<Collection> {
    logger.info(`Creating collection: ${input.name}`);

    const createInput: CollectionCreateInput = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      isPublished: input.isPublished ?? true,
    };

    return this.repository.createCollection(createInput);
  }

  private async updateCollection(id: string, input: CollectionInput): Promise<Collection> {
    logger.info(`Updating collection: ${input.name}`);

    const updateInput = {
      name: input.name,
      description: input.description,
      isPublished: input.isPublished ?? true,
    };

    return this.repository.updateCollection(id, updateInput);
  }

  private async updateChannelListings(
    collectionId: string,
    channelListings: NonNullable<CollectionInput["channelListings"]>
  ) {
    const channels = await this.channelService.getAllChannels();
    
    const addChannels = channelListings
      .filter(listing => listing.isPublished !== false)
      .map(listing => {
        const channel = channels.find(ch => ch.slug === listing.channelSlug);
        if (!channel) {
          throw new Error(`Channel not found: ${listing.channelSlug}`);
        }
        return {
          channelId: channel.id,
          isPublished: listing.isPublished ?? true,
          publishedAt: listing.publishedAt,
        };
      });

    const removeChannels = channelListings
      .filter(listing => listing.isPublished === false)
      .map(listing => {
        const channel = channels.find(ch => ch.slug === listing.channelSlug);
        if (!channel) {
          throw new Error(`Channel not found: ${listing.channelSlug}`);
        }
        return channel.id;
      });

    const updateInput: CollectionChannelListingUpdateInput = {
      addChannels: addChannels.length > 0 ? addChannels : undefined,
      removeChannels: removeChannels.length > 0 ? removeChannels : undefined,
    };

    if (updateInput.addChannels || updateInput.removeChannels) {
      await this.repository.updateCollectionChannelListings(collectionId, updateInput);
    }
  }

  async getCollectionsBySlugs(slugs: string[]) {
    logger.debug("Getting collections by slugs", { slugs });
    const collections = [];
    const channels = await this.channelService.getAllChannels();
    const firstChannel = channels?.[0];
    
    for (const slug of slugs) {
      const collection = await this.repository.getCollectionBySlug(
        slug,
        firstChannel?.slug
      );
      if (collection) {
        collections.push(collection);
      }
    }
    
    return collections;
  }
} 