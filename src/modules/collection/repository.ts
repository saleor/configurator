import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createCollectionMutation = graphql(`
  mutation CreateCollection($input: CollectionCreateInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        name
        slug
        description
      }
      errors {
        field
        message
      }
    }
  }
`);

const updateCollectionMutation = graphql(`
  mutation UpdateCollection($id: ID!, $input: CollectionInput!) {
    collectionUpdate(id: $id, input: $input) {
      collection {
        id
        name
        slug
        description
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const publishCollectionMutation = graphql(`
  mutation PublishCollection($id: ID!, $input: CollectionChannelListingUpdateInput!) {
    collectionChannelListingUpdate(id: $id, input: $input) {
      collection {
        id
        name
        slug
        description
      }
      errors {
        field
        message
      }
    }
  }
`);

const getCollectionBySlugQuery = graphql(`
  query GetCollectionBySlug($slug: String!, $channel: String) {
    collection(slug: $slug, channel: $channel) {
      id
      name
      slug
      description
    }
  }
`);

const collectionAddProductsMutation = graphql(`
  mutation CollectionAddProducts($collectionId: ID!, $products: [ID!]!) {
    collectionAddProducts(collectionId: $collectionId, products: $products) {
      collection {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const collectionRemoveProductsMutation = graphql(`
  mutation CollectionRemoveProducts($collectionId: ID!, $products: [ID!]!) {
    collectionRemoveProducts(collectionId: $collectionId, products: $products) {
      collection {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const collectionChannelListingUpdateMutation = graphql(`
  mutation CollectionChannelListingUpdate($id: ID!, $input: CollectionChannelListingUpdateInput!) {
    collectionChannelListingUpdate(id: $id, input: $input) {
      collection {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

export type Collection = NonNullable<
  NonNullable<
    ResultOf<typeof createCollectionMutation>["collectionCreate"]
  >["collection"]
>;

export type CollectionCreateInput = VariablesOf<
  typeof createCollectionMutation
>["input"];

export type CollectionUpdateInput = VariablesOf<
  typeof updateCollectionMutation
>["input"];

export type CollectionChannelListingUpdateInput = VariablesOf<
  typeof collectionChannelListingUpdateMutation
>["input"];

export interface CollectionOperations {
  createCollection(input: CollectionCreateInput): Promise<Collection>;
  updateCollection(id: string, input: CollectionUpdateInput): Promise<Collection>;
  getCollectionBySlug(slug: string, channel?: string): Promise<Collection | null | undefined>;
  addProductsToCollection(collectionId: string, productIds: string[]): Promise<Collection>;
  removeProductsFromCollection(collectionId: string, productIds: string[]): Promise<Collection>;
  updateCollectionChannelListings(id: string, input: CollectionChannelListingUpdateInput): Promise<Collection>;
}

export class CollectionRepository implements CollectionOperations {
  constructor(private client: Client) {}

  async createCollection(input: CollectionCreateInput): Promise<Collection> {
    const result = await this.client.mutation(createCollectionMutation, {
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to create collection: ${result.error.message}`
      );
    }

    if (result.data?.collectionCreate?.errors?.length) {
      throw new Error(
        `Failed to create collection: ${result.data.collectionCreate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const collection = result.data?.collectionCreate?.collection;
    if (!collection) {
      throw new Error("Failed to create collection: no data returned");
    }

    logger.info(`Collection created: ${collection.name} (${collection.slug})`);
    return collection;
  }

  async updateCollection(
    id: string,
    input: CollectionUpdateInput
  ): Promise<Collection> {
    const result = await this.client.mutation(updateCollectionMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to update collection: ${result.error.message}`
      );
    }

    if (result.data?.collectionUpdate?.errors?.length) {
      throw new Error(
        `Failed to update collection: ${result.data.collectionUpdate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const collection = result.data?.collectionUpdate?.collection;
    if (!collection) {
      throw new Error("Failed to update collection: no data returned");
    }

    logger.info(`Collection updated: ${collection.name} (${collection.slug})`);
    return collection;
  }

  async getCollectionBySlug(slug: string, channel?: string): Promise<Collection | null | undefined> {
    const result = await this.client.query(getCollectionBySlugQuery, { 
      slug,
      channel 
    });

    if (result.error) {
      throw new Error(
        `Failed to fetch collection by slug: ${result.error.message}`
      );
    }

    return result.data?.collection;
  }

  async addProductsToCollection(
    collectionId: string,
    productIds: string[]
  ): Promise<Collection> {
    const result = await this.client.mutation(
      collectionAddProductsMutation,
      {
        collectionId,
        products: productIds,
      }
    );

    if (result.error) {
      throw new Error(
        `Failed to add products to collection: ${result.error.message}`
      );
    }

    if (result.data?.collectionAddProducts?.errors?.length) {
      throw new Error(
        `Failed to add products to collection: ${result.data.collectionAddProducts.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const collection = result.data?.collectionAddProducts?.collection;
    if (!collection) {
      throw new Error("Failed to add products to collection: no data returned");
    }

    return collection as Collection;
  }

  async removeProductsFromCollection(
    collectionId: string,
    productIds: string[]
  ): Promise<Collection> {
    const result = await this.client.mutation(
      collectionRemoveProductsMutation,
      {
        collectionId,
        products: productIds,
      }
    );

    if (result.error) {
      throw new Error(
        `Failed to remove products from collection: ${result.error.message}`
      );
    }

    if (result.data?.collectionRemoveProducts?.errors?.length) {
      throw new Error(
        `Failed to remove products from collection: ${result.data.collectionRemoveProducts.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const collection = result.data?.collectionRemoveProducts?.collection;
    if (!collection) {
      throw new Error("Failed to remove products from collection: no data returned");
    }

    return collection as Collection;
  }

  async updateCollectionChannelListings(
    id: string,
    input: CollectionChannelListingUpdateInput
  ): Promise<Collection> {
    const result = await this.client.mutation(
      collectionChannelListingUpdateMutation,
      {
        id,
        input,
      }
    );

    if (result.error) {
      throw new Error(
        `Failed to update collection channel listings: ${result.error.message}`
      );
    }

    if (result.data?.collectionChannelListingUpdate?.errors?.length) {
      throw new Error(
        `Failed to update collection channel listings: ${result.data.collectionChannelListingUpdate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const collection = result.data?.collectionChannelListingUpdate?.collection;
    if (!collection) {
      throw new Error("Failed to update collection channel listings: no data returned");
    }

    return collection as Collection;
  }
} 