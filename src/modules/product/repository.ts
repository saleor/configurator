import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createProductMutation = graphql(`
  mutation CreateProduct($input: ProductCreateInput!) {
    productCreate(input: $input) {
      product {
        id
        name
        slug
        productType {
          id
          name
        }
        category {
          id
          name
        }
        collections {
          id
          name
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

const updateProductMutation = graphql(`
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    productUpdate(id: $id, input: $input) {
      product {
        id
        name
        slug
        productType {
          id
          name
        }
        category {
          id
          name
        }
        collections {
          id
          name
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

const getProductBySlugQuery = graphql(`
  query GetProductBySlug($slug: String!, $channel: String) {
    product(slug: $slug, channel: $channel) {
      id
      name
      slug
      productType {
        id
        name
      }
      category {
        id
        name
      }
      collections {
        id
        name
      }
      variants {
        id
        name
        sku
      }
    }
  }
`);

const productChannelListingUpdateMutation = graphql(`
  mutation ProductChannelListingUpdate($id: ID!, $input: ProductChannelListingUpdateInput!) {
    productChannelListingUpdate(id: $id, input: $input) {
      product {
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

export type Product = NonNullable<
  NonNullable<
    ResultOf<typeof createProductMutation>["productCreate"]
  >["product"]
>;

export type ProductCreateInput = VariablesOf<
  typeof createProductMutation
>["input"];

export type ProductUpdateInput = VariablesOf<
  typeof updateProductMutation
>["input"];

export type ProductChannelListingUpdateInput = VariablesOf<
  typeof productChannelListingUpdateMutation
>["input"];

export interface ProductOperations {
  createProduct(input: ProductCreateInput): Promise<Product>;
  updateProduct(id: string, input: ProductUpdateInput): Promise<Product>;
  getProductBySlug(slug: string, channel?: string): Promise<Product | null | undefined>;
  updateProductChannelListings(id: string, input: ProductChannelListingUpdateInput): Promise<Product>;
  addProductsToCollection(collectionId: string, productIds: string[]): Promise<void>;
}

export class ProductRepository implements ProductOperations {
  constructor(private client: Client) {}

  async createProduct(input: ProductCreateInput): Promise<Product> {
    const result = await this.client.mutation(createProductMutation, {
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to create product: ${result.error.message}`
      );
    }

    if (result.data?.productCreate?.errors?.length) {
      throw new Error(
        `Failed to create product: ${result.data.productCreate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const product = result.data?.productCreate?.product;
    if (!product) {
      throw new Error("Failed to create product: no data returned");
    }

    logger.info(`Product created: ${product.name} (${product.slug})`);
    return product;
  }

  async updateProduct(
    id: string,
    input: ProductUpdateInput
  ): Promise<Product> {
    const result = await this.client.mutation(updateProductMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to update product: ${result.error.message}`
      );
    }

    if (result.data?.productUpdate?.errors?.length) {
      throw new Error(
        `Failed to update product: ${result.data.productUpdate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const product = result.data?.productUpdate?.product;
    if (!product) {
      throw new Error("Failed to update product: no data returned");
    }

    logger.info(`Product updated: ${product.name} (${product.slug})`);
    return product;
  }

  async getProductBySlug(slug: string, channel?: string): Promise<Product | null | undefined> {
    const result = await this.client.query(getProductBySlugQuery, { 
      slug,
      channel 
    });

    if (result.error) {
      throw new Error(
        `Failed to fetch product by slug: ${result.error.message}`
      );
    }

    return result.data?.product;
  }

  async updateProductChannelListings(
    id: string,
    input: ProductChannelListingUpdateInput
  ): Promise<Product> {
    const result = await this.client.mutation(productChannelListingUpdateMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to update product channel listings: ${result.error.message}`
      );
    }

    if (result.data?.productChannelListingUpdate?.errors?.length) {
      throw new Error(
        `Failed to update product channel listings: ${result.data.productChannelListingUpdate.errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    const product = result.data?.productChannelListingUpdate?.product;
    if (!product) {
      throw new Error("Failed to update product channel listings: no data returned");
    }

    logger.info(`Product channel listings updated: ${product.name}`);
    return product;
  }

  async addProductsToCollection(
    collectionId: string,
    productIds: string[]
  ): Promise<void> {
    const result = await this.client.mutation(collectionAddProductsMutation, {
      collectionId,
      products: productIds,
    });

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

    logger.info(`Products added to collection`);
  }
} 