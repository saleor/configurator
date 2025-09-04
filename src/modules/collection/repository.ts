import type { AnyVariables, Client } from "@urql/core";
import { graphql, type ResultOf, type TadaDocumentNode, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import type { CollectionChannelListingUpdateInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";

const GetCollections = graphql(`
  query GetCollections($first: Int!) {
    collections(first: $first) {
      edges {
        node {
          id
          name
          slug
          description
          backgroundImage {
            url
            alt
          }
          products(first: 100) {
            edges {
              node {
                id
                slug
                name
              }
            }
          }
          channelListings {
            id
            isPublished
            publishedAt
            channel {
              id
              slug
              name
            }
          }
        }
      }
    }
  }
`);

const GetCollectionBySlug = graphql(`
  query GetCollectionBySlug($slug: String!) {
    collection(slug: $slug) {
      id
      name
      slug
      description
      backgroundImage {
        url
        alt
      }
      products(first: 100) {
        edges {
          node {
            id
            slug
            name
          }
        }
      }
      channelListings {
        id
        isPublished
        publishedAt
        channel {
          id
          slug
          name
        }
      }
    }
  }
`);

const CreateCollection = graphql(`
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
        code
      }
    }
  }
`);

const UpdateCollection = graphql(`
  mutation UpdateCollection($id: ID!, $input: CollectionInput!) {
    collectionUpdate(id: $id, input: $input) {
      collection {
        id
        name
        slug
        description
        backgroundImage {
          url
          alt
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const AssignProductsToCollection = graphql(`
  mutation AssignProductsToCollection($collectionId: ID!, $productIds: [ID!]!) {
    collectionAddProducts(collectionId: $collectionId, products: $productIds) {
      collection {
        id
        products(first: 100) {
          edges {
            node {
              id
              slug
            }
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const RemoveProductsFromCollection = graphql(`
  mutation RemoveProductsFromCollection($collectionId: ID!, $productIds: [ID!]!) {
    collectionRemoveProducts(collectionId: $collectionId, products: $productIds) {
      collection {
        id
        products(first: 100) {
          edges {
            node {
              id
              slug
            }
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

const UpdateCollectionChannelListings = graphql(`
  mutation UpdateCollectionChannelListings($id: ID!, $input: CollectionChannelListingUpdateInput!) {
    collectionChannelListingUpdate(id: $id, input: $input) {
      collection {
        id
        channelListings {
          id
          isPublished
          publishedAt
          channel {
            id
            slug
            name
          }
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

// Type exports for external use
export type Collection = NonNullable<ResultOf<typeof GetCollectionBySlug>["collection"]>;
export type CollectionCreateInput = VariablesOf<typeof CreateCollection>["input"];
export type CollectionInput = VariablesOf<typeof UpdateCollection>["input"];

export interface CollectionOperations {
  getCollections(): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | null>;
  createCollection(input: CollectionCreateInput): Promise<Collection>;
  updateCollection(id: string, input: CollectionInput): Promise<Collection>;
  assignProducts(collectionId: string, productIds: string[]): Promise<void>;
  removeProducts(collectionId: string, productIds: string[]): Promise<void>;
  updateChannelListings(id: string, input: CollectionChannelListingUpdateInput): Promise<void>;
}

export class CollectionRepository implements CollectionOperations {
  constructor(private client: Client) {}

  private async query<TData, TVariables extends AnyVariables>(
    document: TadaDocumentNode<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.query(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError("Query failed", result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from query");
    }

    return result.data;
  }

  private async mutation<TData, TVariables extends AnyVariables>(
    document: TadaDocumentNode<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.mutation(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError("Query failed", result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from mutation");
    }

    return result.data;
  }

  async getCollections(): Promise<Collection[]> {
    logger.debug("Fetching collections from Saleor");
    const data = await this.query(GetCollections, { first: 100 }) as ResultOf<typeof GetCollections>;
    const collections = data.collections?.edges?.map(edge => edge.node).filter(node => node !== null) ?? [];
    logger.debug(`Fetched ${collections.length} collections`);
    return collections as Collection[];
  }

  async getCollectionBySlug(slug: string): Promise<Collection | null> {
    logger.debug("Fetching collection by slug", { slug });
    const data = await this.query(GetCollectionBySlug, { slug }) as ResultOf<typeof GetCollectionBySlug>;
    return data.collection as Collection | null;
  }

  async createCollection(input: CollectionCreateInput): Promise<Collection> {
    logger.debug("Creating collection", { name: input.name, slug: input.slug });
    const data = await this.mutation(CreateCollection, { input }) as ResultOf<typeof CreateCollection>;

    if (data.collectionCreate?.errors && data.collectionCreate.errors.length > 0) {
      const error = data.collectionCreate.errors[0];
      throw new GraphQLError(`Failed to create collection: ${error.message}`);
    }

    if (!data.collectionCreate?.collection) {
      throw new GraphQLError("Collection creation returned no collection");
    }

    logger.debug("Successfully created collection", {
      id: data.collectionCreate.collection.id,
      name: data.collectionCreate.collection.name,
    });

    return data.collectionCreate.collection as Collection;
  }

  async updateCollection(id: string, input: CollectionInput): Promise<Collection> {
    logger.debug("Updating collection", { id, input });
    const data = await this.mutation(UpdateCollection, { id, input }) as ResultOf<typeof UpdateCollection>;

    if (data.collectionUpdate?.errors && data.collectionUpdate.errors.length > 0) {
      const error = data.collectionUpdate.errors[0];
      throw new GraphQLError(`Failed to update collection: ${error.message}`);
    }

    if (!data.collectionUpdate?.collection) {
      throw new GraphQLError("Collection update returned no collection");
    }

    logger.debug("Successfully updated collection", {
      id: data.collectionUpdate.collection.id,
      name: data.collectionUpdate.collection.name,
    });

    return data.collectionUpdate.collection as Collection;
  }

  async assignProducts(collectionId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) {
      logger.debug("No products to assign to collection");
      return;
    }

    logger.debug("Assigning products to collection", {
      collectionId,
      productCount: productIds.length,
    });
    const data = await this.mutation(AssignProductsToCollection, {
      collectionId,
      productIds,
    }) as ResultOf<typeof AssignProductsToCollection>;

    if (data.collectionAddProducts?.errors && data.collectionAddProducts.errors.length > 0) {
      const error = data.collectionAddProducts.errors[0];
      throw new GraphQLError(`Failed to assign products to collection: ${error.message}`);
    }

    logger.debug("Successfully assigned products to collection", {
      collectionId,
      productCount: productIds.length,
    });
  }

  async removeProducts(collectionId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) {
      logger.debug("No products to remove from collection");
      return;
    }

    logger.debug("Removing products from collection", {
      collectionId,
      productCount: productIds.length,
    });
    const data = await this.mutation(RemoveProductsFromCollection, {
      collectionId,
      productIds,
    }) as ResultOf<typeof RemoveProductsFromCollection>;

    if (data.collectionRemoveProducts?.errors && data.collectionRemoveProducts.errors.length > 0) {
      const error = data.collectionRemoveProducts.errors[0];
      throw new GraphQLError(`Failed to remove products from collection: ${error.message}`);
    }

    logger.debug("Successfully removed products from collection", {
      collectionId,
      productCount: productIds.length,
    });
  }

  async updateChannelListings(
    id: string,
    input: CollectionChannelListingUpdateInput
  ): Promise<void> {
    logger.debug("Updating collection channel listings", { id, input });
    const data = await this.mutation(UpdateCollectionChannelListings, { id, input }) as ResultOf<typeof UpdateCollectionChannelListings>;

    if (
      data.collectionChannelListingUpdate?.errors &&
      data.collectionChannelListingUpdate.errors.length > 0
    ) {
      const error = data.collectionChannelListingUpdate.errors[0];
      throw new GraphQLError(`Failed to update collection channel listings: ${error.message}`);
    }

    logger.debug("Successfully updated collection channel listings", { id });
  }
}
