import type {
  CollectionChannelListingUpdateInput,
  PublishableChannelListingInput,
} from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import { processInChunks } from "../../lib/utils/chunked-processor";
import { object } from "../../lib/utils/object";
import type { ChannelService } from "../channel/channel-service";
import type { ProductService } from "../product/product-service";
import { CollectionOperationError, CollectionValidationError } from "./errors";
import type {
  Collection,
  CollectionCreateInput,
  CollectionInput,
  CollectionOperations,
} from "./repository";

export interface CollectionInputConfig {
  name: string;
  slug: string;
  description?: string;
  isPublished?: boolean;
  products?: string[]; // Product slugs
  channelListings?: Array<{
    channelSlug: string;
    isPublished?: boolean;
    publishedAt?: string;
  }>;
}

export class CollectionService {
  constructor(
    private repository: CollectionOperations,
    private productService: ProductService,
    private channelService: ChannelService
  ) {}

  private async getExistingCollection(slug: string): Promise<Collection | null> {
    try {
      logger.debug("Looking up existing collection", { slug });
      const collection = await this.repository.getCollectionBySlug(slug);

      if (collection) {
        logger.debug("Found existing collection", {
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
        });
      } else {
        logger.debug("Collection not found", { slug });
      }

      return collection;
    } catch (error) {
      throw new CollectionOperationError(
        "fetch",
        slug,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private validateCollectionInput(input: CollectionInputConfig): void {
    if (!input.slug?.trim()) {
      throw new CollectionValidationError("Collection slug is required", "slug");
    }
    if (!input.name?.trim()) {
      throw new CollectionValidationError("Collection name is required", "name");
    }
  }

  private mapInputToCreateInput(input: CollectionInputConfig): CollectionCreateInput {
    return object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      description: input.description,
      isPublished: input.isPublished,
      products: [], // Products will be assigned after creation
    });
  }

  private mapInputToUpdateInput(input: CollectionInputConfig): CollectionInput {
    return object.filterUndefinedValues({
      name: input.name,
      slug: input.slug,
      description: input.description,
      isPublished: input.isPublished,
    });
  }

  async createCollection(input: CollectionInputConfig): Promise<Collection> {
    logger.debug("Creating new collection", { name: input.name, slug: input.slug });

    this.validateCollectionInput(input);

    try {
      const createInput = this.mapInputToCreateInput(input);
      const collection = await this.repository.createCollection(createInput);

      // Handle product assignments
      if (input.products && input.products.length > 0) {
        await this.syncCollectionProducts(collection.id, input.products, []);
      }

      // Handle channel listings
      if (input.channelListings && input.channelListings.length > 0) {
        await this.updateChannelListings(collection.id, input.channelListings);
      }

      logger.debug("Successfully created collection", {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
      });
      return collection;
    } catch (error) {
      throw new CollectionOperationError(
        "create",
        input.slug,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async updateCollection(id: string, input: CollectionInputConfig): Promise<Collection> {
    try {
      logger.debug("Updating collection", { id, name: input.name, slug: input.slug });

      const updateInput = this.mapInputToUpdateInput(input);
      const collection = await this.repository.updateCollection(id, updateInput);

      // Handle product updates if provided
      if (input.products !== undefined) {
        const existingCollection = await this.repository.getCollectionBySlug(input.slug);
        const currentProductSlugs =
          existingCollection?.products?.edges
            ?.map((edge) => edge.node.slug)
            .filter((slug): slug is string => !!slug) ?? [];

        await this.syncCollectionProducts(id, input.products, currentProductSlugs);
      }

      // Handle channel listing updates
      if (input.channelListings && input.channelListings.length > 0) {
        await this.updateChannelListings(id, input.channelListings);
      }

      logger.debug("Successfully updated collection", {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
      });
      return collection;
    } catch (error) {
      throw new CollectionOperationError(
        "update",
        input.slug,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async getOrCreateCollection(input: CollectionInputConfig): Promise<Collection> {
    logger.debug("Getting or creating collection", { name: input.name, slug: input.slug });
    this.validateCollectionInput(input);

    const existingCollection = await this.getExistingCollection(input.slug);

    if (existingCollection) {
      logger.debug("Updating existing collection", {
        id: existingCollection.id,
        name: input.name,
        slug: input.slug,
      });
      return this.updateCollection(existingCollection.id, input);
    }

    return this.createCollection(input);
  }

  async bootstrapCollections(inputs: CollectionInputConfig[]): Promise<Collection[]> {
    logger.debug("Bootstrapping collections", { count: inputs.length });

    // Validate unique slugs
    const slugs = new Set<string>();
    const duplicateSlugs = new Set<string>();

    for (const input of inputs) {
      if (slugs.has(input.slug)) {
        duplicateSlugs.add(input.slug);
      }
      slugs.add(input.slug);
    }

    if (duplicateSlugs.size > 0) {
      throw new CollectionValidationError(
        `Duplicate collection slugs found: ${Array.from(duplicateSlugs).join(", ")}`
      );
    }

    const { successes, failures } = await processInChunks(
      inputs,
      async (chunk) => {
        return Promise.all(chunk.map((input) => this.getOrCreateCollection(input)));
      },
      {
        chunkSize: 10,
        delayMs: 500,
        entityType: "collections",
      }
    );

    const results = {
      successes: successes.map((s) => ({ item: s.item, result: s.result })),
      failures: failures.map((f) => ({ item: f.item, error: f.error })),
    };

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} of ${inputs.length} collections`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          collection: f.item.slug,
          error: f.error.message,
        })),
      });
      throw new CollectionOperationError(
        "bootstrap",
        "collections",
        results.failures.map((f) => `${f.item.slug}: ${f.error.message}`).join("; ")
      );
    }

    logger.debug("Successfully bootstrapped all collections", {
      count: results.successes.length,
    });
    // Flatten the results - each success contains a single Collection, not an array
    return results.successes.flatMap((s) => (Array.isArray(s.result) ? s.result : [s.result]));
  }

  async syncCollectionProducts(
    collectionId: string,
    desiredProductSlugs: string[],
    currentProductSlugs: string[]
  ): Promise<void> {
    const toAdd = desiredProductSlugs.filter((slug) => !currentProductSlugs.includes(slug));
    const toRemove = currentProductSlugs.filter((slug) => !desiredProductSlugs.includes(slug));

    if (toAdd.length > 0) {
      logger.debug("Adding products to collection", {
        collectionId,
        productSlugs: toAdd,
      });

      // Resolve product slugs to IDs
      const productIds: string[] = [];
      for (const slug of toAdd) {
        try {
          const product = await this.productService.getProductBySlug(slug);
          if (product) {
            productIds.push(product.id);
          } else {
            logger.warn(`Product with slug "${slug}" not found, skipping`);
          }
        } catch (error) {
          logger.warn(`Failed to resolve product slug "${slug}": ${error}`);
        }
      }

      if (productIds.length > 0) {
        await this.repository.assignProducts(collectionId, productIds);
      }
    }

    if (toRemove.length > 0) {
      logger.debug("Removing products from collection", {
        collectionId,
        productSlugs: toRemove,
      });

      // Resolve product slugs to IDs
      const productIds: string[] = [];
      for (const slug of toRemove) {
        try {
          const product = await this.productService.getProductBySlug(slug);
          if (product) {
            productIds.push(product.id);
          }
        } catch (error) {
          logger.warn(`Failed to resolve product slug "${slug}" for removal: ${error}`);
        }
      }

      if (productIds.length > 0) {
        await this.repository.removeProducts(collectionId, productIds);
      }
    }
  }

  private async updateChannelListings(
    collectionId: string,
    channelListings: CollectionInputConfig["channelListings"]
  ): Promise<void> {
    if (!channelListings || channelListings.length === 0) {
      return;
    }

    logger.debug("Updating collection channel listings", {
      collectionId,
      channelCount: channelListings.length,
    });

    const addChannels: PublishableChannelListingInput[] = [];

    for (const listing of channelListings) {
      try {
        const channel = await this.channelService.getChannelBySlug(listing.channelSlug);
        if (channel) {
          addChannels.push({
            channelId: channel.id,
            isPublished: listing.isPublished,
            publishedAt: listing.publishedAt,
          });
        } else {
          logger.warn(`Channel with slug "${listing.channelSlug}" not found, skipping`);
        }
      } catch (error) {
        logger.warn(`Failed to resolve channel slug "${listing.channelSlug}": ${error}`);
      }
    }

    if (addChannels.length > 0) {
      const input: CollectionChannelListingUpdateInput = {
        addChannels,
        removeChannels: [], // We don't remove channels, only add/update
      };
      await this.repository.updateChannelListings(collectionId, input);
    }
  }

  async getAllCollections(): Promise<Collection[]> {
    try {
      logger.debug("Fetching all collections");
      const collections = await this.repository.getCollections();
      logger.debug(`Fetched ${collections.length} collections`);
      return collections;
    } catch (error) {
      throw new CollectionOperationError(
        "fetch",
        "all",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async getCollectionBySlug(slug: string): Promise<Collection | null> {
    return this.getExistingCollection(slug);
  }
}
