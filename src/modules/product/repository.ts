import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { logger } from "../../lib/logger";

const createProductMutation = graphql(`
  mutation CreateProduct($input: ProductCreateInput!) {
    productCreate(input: $input) {
      product {
        id
        name
        slug
        description
        productType {
          id
          name
        }
        category {
          id
          name
        }
        channelListings {
          id
          channel {
            id
            name
          }
          isPublished
          visibleInListings
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type ProductCreateInput = VariablesOf<typeof createProductMutation>["input"];

const updateProductMutation = graphql(`
  mutation UpdateProduct($id: ID!, $input: ProductInput!) {
    productUpdate(id: $id, input: $input) {
      product {
        id
        name
        slug
        description
        productType {
          id
          name
        }
        category {
          id
          name
        }
        channelListings {
          id
          channel {
            id
            name
          }
          isPublished
          visibleInListings
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type ProductUpdateInput = VariablesOf<typeof updateProductMutation>["input"];

const createProductVariantMutation = graphql(`
  mutation CreateProductVariant($input: ProductVariantCreateInput!) {
    productVariantCreate(input: $input) {
      productVariant {
        id
        name
        sku
        weight {
          value
        }
        channelListings {
          id
          channel {
            id
            name
          }
          price {
            amount
          }
          costPrice {
            amount
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type ProductVariantCreateInput = VariablesOf<typeof createProductVariantMutation>["input"];
export type ProductVariantUpdateInput = VariablesOf<typeof updateProductVariantMutation>["input"];

// TODO: Add productChannelListingUpdate mutation in separate commit

const getProductByNameQuery = graphql(`
  query GetProductByName($name: String!) {
    products(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          productType {
            id
            name
          }
          category {
            id
            name
          }
        }
      }
    }
  }
`);
const getProductBySlugQuery = graphql(`
  query GetProductBySlug($slug: String!) {
    products(filter: { slugs: [$slug] }, first: 1) {
      edges {
        node {
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
        }
      }
    }
  }
`);

const getProductTypeByNameQuery = graphql(`
  query GetProductTypeByName($name: String!) {
    productTypes(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`);

const getCategoryByNameQuery = graphql(`
  query GetCategoryByName($name: String!) {
    categories(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          slug
        }
      }
    }
  }
`);

const getCategoryBySlugQuery = graphql(`
  query GetCategoryBySlug($slug: String!) {
    categories(filter: { slugs: [$slug] }, first: 100) {
      edges {
        node {
          id
          name
          slug
          parent {
            id
            name
            slug
          }
        }
      }
    }
  }
`);

const getAttributeByNameQuery = graphql(`
  query GetAttributeByName($name: String!) {
    attributes(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          inputType
          choices {
            edges {
              node {
                id
                name
                value
              }
            }
          }
        }
      }
    }
  }
`);

const getProductVariantBySkuQuery = graphql(`
  query GetProductVariantBySku($skus: [String!]!) {
    productVariants(filter: { sku: $skus }, first: 1) {
      edges {
        node {
          id
          name
          sku
          weight {
            value
          }
          channelListings {
            id
            channel {
              id
              name
            }
            price {
              amount
            }
            costPrice {
              amount
            }
          }
        }
      }
    }
  }
`);

const updateProductVariantMutation = graphql(`
  mutation UpdateProductVariant($id: ID!, $input: ProductVariantInput!) {
    productVariantUpdate(id: $id, input: $input) {
      productVariant {
        id
        name
        sku
        weight {
          value
        }
        channelListings {
          id
          channel {
            id
            name
          }
          price {
            amount
          }
          costPrice {
            amount
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

const getChannelBySlugQuery = graphql(`
  query GetChannelBySlug($slug: String!) {
    channels(first: 100) {
      edges {
        node {
          id
          name
          slug
          currencyCode
        }
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
        slug
        description
        productType {
          id
          name
        }
        category {
          id
          name
        }
        channelListings {
          id
          channel {
            id
            slug
          }
          isPublished
          visibleInListings
          publishedAt
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

const productVariantChannelListingUpdateMutation = graphql(`
  mutation ProductVariantChannelListingUpdate($id: ID!, $input: [ProductVariantChannelListingAddInput!]!) {
    productVariantChannelListingUpdate(id: $id, input: $input) {
      productVariant {
        id
        name
        sku
        channelListings {
          id
          channel {
            id
            slug
          }
          price {
            amount
          }
          costPrice {
            amount
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

export type Product = NonNullable<
  NonNullable<ResultOf<typeof getProductByNameQuery>["products"]>["edges"]
>[number]["node"];

export type ProductWithSlug = NonNullable<
  NonNullable<ResultOf<typeof getProductBySlugQuery>["products"]>["edges"]
>[number]["node"];

export type ProductVariant = NonNullable<
  NonNullable<
    ResultOf<typeof createProductVariantMutation>["productVariantCreate"]
  >["productVariant"]
>;

export type ProductVariantWithChannelListings = NonNullable<
  NonNullable<
    ResultOf<
      typeof productVariantChannelListingUpdateMutation
    >["productVariantChannelListingUpdate"]
  >["productVariant"]
>;

export type ProductChannelListingUpdateInput = VariablesOf<
  typeof productChannelListingUpdateMutation
>["input"];

export type ProductVariantChannelListingAddInput = VariablesOf<
  typeof productVariantChannelListingUpdateMutation
>["input"][number];

// Extract Channel type from query result using any to bypass type issues
export type Channel = {
  id: string;
  name: string;
  slug: string;
  currencyCode?: string;
};

export interface ProductOperations {
  createProduct(input: ProductCreateInput): Promise<Product>;
  updateProduct(id: string, input: ProductUpdateInput): Promise<Product>;
  createProductVariant(input: ProductVariantCreateInput): Promise<ProductVariant>;
  updateProductVariant(id: string, input: ProductVariantUpdateInput): Promise<ProductVariant>;
  getProductByName(name: string): Promise<Product | null | undefined>;
  getProductBySlug(slug: string): Promise<Product | null | undefined>;
  getProductVariantBySku(sku: string): Promise<ProductVariant | null>;
  getProductTypeByName(name: string): Promise<{ id: string; name: string } | null>;
  getCategoryByName(name: string): Promise<{ id: string; name: string } | null>;
  getCategoryBySlug(slug: string): Promise<{ id: string; name: string; slug: string } | null>;
  getCategoryByPath(path: string): Promise<{ id: string; name: string } | null>;
  getAttributeByName(name: string): Promise<Attribute | null>;
  getChannelBySlug(slug: string): Promise<Channel | null>;
  updateProductChannelListings(
    id: string,
    input: ProductChannelListingUpdateInput
  ): Promise<Product | null>;
  updateProductVariantChannelListings(
    id: string,
    input: ProductVariantChannelListingAddInput[]
  ): Promise<ProductVariantWithChannelListings | null>;
}

export type Attribute = NonNullable<
  NonNullable<ResultOf<typeof getAttributeByNameQuery>["attributes"]>["edges"]
>[number]["node"];

export class ProductRepository implements ProductOperations {
  constructor(private client: Client) {}

  async createProduct(input: ProductCreateInput): Promise<Product> {
    logger.debug("Creating product", { name: input.name, input });

    const result = await this.client.mutation(createProductMutation, {
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productCreate?.product) {
      const businessErrors = result.data?.productCreate?.errors;
      if (businessErrors && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to create product: ${errorMessage}`);
      }
      throw new Error(`Failed to create product: Unknown error`);
    }

    const product = result.data.productCreate.product;
    logger.debug("Product created", { id: product.id, name: product.name });

    return product;
  }

  async updateProduct(id: string, input: ProductUpdateInput): Promise<Product> {
    logger.debug("Updating product", { id, input });

    const result = await this.client.mutation(updateProductMutation, {
      id,
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productUpdate?.product) {
      const businessErrors = result.data?.productUpdate?.errors;
      if (businessErrors && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to update product: ${errorMessage}`);
      }
      throw new Error(`Failed to update product: Unknown error`);
    }

    const product = result.data.productUpdate.product;
    logger.debug("Product updated", { id: product.id, name: product.name });

    return product;
  }

  async createProductVariant(input: ProductVariantCreateInput): Promise<ProductVariant> {
    logger.debug("Creating product variant", {
      productId: input.product,
      name: input.name,
      sku: input.sku,
    });

    const result = await this.client.mutation(createProductVariantMutation, {
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productVariantCreate?.productVariant) {
      const businessErrors = result.data?.productVariantCreate?.errors;
      if (businessErrors && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to create product variant: ${errorMessage}`);
      }
      throw new Error(`Failed to create product variant: Unknown error`);
    }

    const variant = result.data.productVariantCreate.productVariant;
    logger.debug("Product variant created", {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
    });

    return variant;
  }

  async updateProductVariant(
    id: string,
    input: ProductVariantUpdateInput
  ): Promise<ProductVariant> {
    logger.debug("Updating product variant", { variantId: id, input });

    const result = await this.client.mutation(updateProductVariantMutation, {
      id,
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productVariantUpdate?.productVariant) {
      const businessErrors = result.data?.productVariantUpdate?.errors;
      if (businessErrors && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to update product variant: ${errorMessage}`);
      }
      throw new Error(`Failed to update product variant: Unknown error`);
    }

    const variant = result.data.productVariantUpdate.productVariant;
    logger.debug("Product variant updated", {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
    });

    return variant;
  }

  async getProductVariantBySku(sku: string): Promise<ProductVariant | null> {
    logger.debug("Looking up product variant by SKU", { sku });

    const result = await this.client.query(getProductVariantBySkuQuery, {
      skus: [sku],
    });

    logger.debug("Variant query result", {
      variantCount: result.data?.productVariants?.edges?.length || 0,
      error: result.error?.message,
    });

    const variant = result.data?.productVariants?.edges?.[0]?.node;

    if (variant) {
      logger.debug("Found existing variant", {
        id: variant.id,
        sku: variant.sku,
      });
    } else {
      logger.debug("No variant found with SKU", {
        sku,
        totalVariants: result.data?.productVariants?.edges?.length || 0,
        allVariantSkus: result.data?.productVariants?.edges?.map((edge) => edge.node.sku) || [],
      });
    }

    return variant || null;
  }

  async getProductByName(name: string): Promise<Product | null | undefined> {
    const result = await this.client.query(getProductByNameQuery, { name });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.products?.edges?.find((edge) => edge.node?.name === name);

    return exactMatch?.node;
  }

  async getProductBySlug(slug: string): Promise<Product | null | undefined> {
    logger.debug("Looking up product by slug", { slug });

    const result = await this.client.query(getProductBySlugQuery, { slug });

    if (result.error) {
      throw result.error;
    }

    logger.debug("Product slug query result", {
      productCount: result.data?.products?.edges?.length || 0,
      // error: result.error?.message,
    });

    const product = result.data?.products?.edges?.[0]?.node;

    if (product) {
      logger.debug("Found existing product", {
        id: product.id,
        slug: product.slug,
        name: product.name,
      });
    } else {
      logger.debug("No product found with slug", { slug });
    }

    return product || null;
  }

  async getProductTypeByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await this.client.query(getProductTypeByNameQuery, { name });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.productTypes?.edges?.find((edge) => edge.node?.name === name);

    return exactMatch?.node || null;
  }

  async getCategoryByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await this.client.query(getCategoryByNameQuery, { name });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.categories?.edges?.find((edge) => edge.node?.name === name);

    return exactMatch?.node || null;
  }

  async getCategoryBySlug(
    slug: string
  ): Promise<{ id: string; name: string; slug: string } | null> {
    logger.debug("Looking up category by slug", { slug });

    const result = await this.client.query(getCategoryBySlugQuery, { slug });

    // Find exact match among all categories by slug
    const exactMatch = result.data?.categories?.edges?.find((edge) => edge.node?.slug === slug);
    const category = exactMatch?.node;

    if (category) {
      logger.debug("Found category by slug", {
        id: category.id,
        name: category.name,
        slug: category.slug,
      });
    } else {
      logger.debug("No category found with slug", { slug });
    }

    return category || null;
  }

  async getCategoryByPath(path: string): Promise<{ id: string; name: string } | null> {
    logger.debug("Resolving category path", { path });

    const parts = path.split("/");

    if (parts.length === 1) {
      // Simple category lookup by slug (as per schema requirement)
      return this.getCategoryBySlug(parts[0]);
    }

    // For nested categories, try to resolve by hierarchical path
    return this.resolveCategoryHierarchy(parts);
  }

  private async resolveCategoryHierarchy(
    slugParts: string[]
  ): Promise<{ id: string; name: string } | null> {
    const path = slugParts.join("/");

    // First, try to find the final category slug directly
    const finalCategorySlug = slugParts[slugParts.length - 1];
    const categoryBySlug = await this.getCategoryBySlug(finalCategorySlug);

    if (!categoryBySlug) {
      logger.warn("Category not found by final slug", {
        path,
        finalSlug: finalCategorySlug,
      });
      return null;
    }

    // For now, return the found category
    // TODO: Add full hierarchy verification by checking parent chain
    logger.debug("Found category by final slug", {
      path,
      foundCategory: {
        id: categoryBySlug.id,
        name: categoryBySlug.name,
        slug: categoryBySlug.slug,
      },
    });

    if (slugParts.length > 1) {
      logger.info("Hierarchical path resolution simplified", {
        path,
        resolvedSlug: finalCategorySlug,
        note: "Full hierarchy verification will be added in future enhancement",
      });
    }

    return categoryBySlug;
  }

  async getAttributeByName(name: string): Promise<Attribute | null> {
    logger.debug("Looking up attribute by name", { name });

    const result = await this.client.query(getAttributeByNameQuery, { name });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.attributes?.edges?.find((edge) => edge.node?.name === name);
    const attribute = exactMatch?.node;

    if (attribute) {
      logger.debug("Found attribute", {
        id: attribute.id,
        name: attribute.name,
      });
    } else {
      logger.debug("No attribute found", { name });
    }

    return attribute || null;
  }

  async getChannelBySlug(slug: string): Promise<Channel | null> {
    logger.debug("Looking up channel by slug", { slug });

    const result = await this.client.query(getChannelBySlugQuery, { slug });

    // Find exact match among search results
    // Use any to bypass gql.tada typing issues with channels.edges
    // biome-ignore lint/suspicious/noExplicitAny: GraphQL typing workaround
    const channels = result.data?.channels as any;
    // biome-ignore lint/suspicious/noExplicitAny: GraphQL typing workaround
    const exactMatch = channels?.edges?.find((edge: any) => edge.node?.slug === slug);

    const channel = exactMatch?.node;

    if (channel) {
      logger.debug("Found channel", {
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
      });
    } else {
      logger.debug("No channel found with slug", { slug });
    }

    return channel || null;
  }

  async updateProductChannelListings(
    id: string,
    input: ProductChannelListingUpdateInput
  ): Promise<Product | null> {
    logger.debug("Updating product channel listings", { productId: id, input });

    const result = await this.client.mutation(productChannelListingUpdateMutation, {
      id,
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productChannelListingUpdate?.product) {
      const businessErrors = result.data?.productChannelListingUpdate?.errors;
      if (businessErrors && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to update product channel listings: ${errorMessage}`);
      }
      logger.warn("Product channel listings update returned no product", { productId: id });
      return null;
    }

    const product = result.data.productChannelListingUpdate.product;
    logger.debug("Product channel listings updated", {
      productId: product.id,
      channelListings: product.channelListings?.length || 0,
    });

    return product as unknown as Product;
  }

  async updateProductVariantChannelListings(
    id: string,
    input: ProductVariantChannelListingAddInput[]
  ): Promise<ProductVariantWithChannelListings | null> {
    logger.debug("Updating product variant channel listings", {
      variantId: id,
      channelCount: input.length,
    });

    const result = await this.client.mutation(productVariantChannelListingUpdateMutation, {
      id,
      input,
    });

    if (result.error) {
      throw result.error;
    }

    if (!result.data?.productVariantChannelListingUpdate?.productVariant) {
      const businessErrors = result.data?.productVariantChannelListingUpdate?.errors;
      if (businessErrors && Array.isArray(businessErrors) && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to update variant channel listings: ${errorMessage}`);
      }
      logger.warn("Variant channel listings update returned no variant", { variantId: id });
      return null;
    }

    const variant = result.data.productVariantChannelListingUpdate.productVariant as ProductVariant;

    logger.debug("Product variant channel listings updated", {
      variantId: variant.id,
      channelListings: variant.channelListings?.length || 0,
    });

    return variant;
  }
}
