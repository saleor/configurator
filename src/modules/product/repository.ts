import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { logger } from "../../lib/logger";
import { PRODUCT_MEDIA_SOURCE_METADATA_KEY } from "./media-metadata";

function slugify(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

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
        media {
          id
          alt
          type
          url
          metadata {
            key
            value
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
        media {
          id
          alt
          type
          url
          metadata {
            key
            value
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

// Bulk operation types
export type ProductBulkCreateInput = VariablesOf<typeof productBulkCreateMutation>;
export type ProductVariantBulkCreateInput = VariablesOf<typeof productVariantBulkCreateMutation>;
export type ProductVariantBulkUpdateInput = VariablesOf<typeof productVariantBulkUpdateMutation>;

export type ProductBulkCreateResult = NonNullable<
  NonNullable<ResultOf<typeof productBulkCreateMutation>>["productBulkCreate"]
>;
export type ProductVariantBulkCreateResult = NonNullable<
  NonNullable<ResultOf<typeof productVariantBulkCreateMutation>>["productVariantBulkCreate"]
>;
export type ProductVariantBulkUpdateResult = NonNullable<
  NonNullable<ResultOf<typeof productVariantBulkUpdateMutation>>["productVariantBulkUpdate"]
>;

// TODO: Add productChannelListingUpdate mutation in separate commit

const getProductByNameQuery = graphql(`
  query GetProductByName($name: String!) {
    products(filter: { search: $name }, first: 100) {
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
          media {
            id
            alt
            type
            url
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
          media {
            id
            alt
            type
            url
          }
        }
      }
    }
  }
`);

const getProductsBySlugsBulkQuery = graphql(`
  query GetProductsBySlugs($slugs: [String!]!) {
    products(filter: { slugs: $slugs }, first: 100) {
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
            slug
          }
          media {
            id
            alt
            type
            url
            metadata {
              key
              value
            }
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

const getProductTypeBySlugQuery = graphql(`
  query GetProductTypeBySlug($slug: String!) {
    productTypes(filter: { slugs: [$slug] }, first: 100) {
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
    category(slug: $slug) {
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
`);

const getProductMediaQuery = graphql(`
  query GetProductMedia($id: ID!) {
    product(id: $id) {
      id
      media {
        id
        alt
        type
        url
        metadata {
          key
          value
        }
      }
    }
  }
`);

const createProductMediaMutation = graphql(`
  mutation CreateProductMedia($input: ProductMediaCreateInput!) {
    productMediaCreate(input: $input) {
      media {
        id
        alt
        type
        url
        metadata {
          key
          value
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

const updateProductMediaMutation = graphql(`
  mutation UpdateProductMedia($id: ID!, $input: ProductMediaUpdateInput!) {
    productMediaUpdate(id: $id, input: $input) {
      media {
        id
        alt
        type
        url
        metadata {
          key
          value
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

const deleteProductMediaMutation = graphql(`
  mutation DeleteProductMedia($id: ID!) {
    productMediaDelete(id: $id) {
      media {
        id
      }
      errors {
        field
        message
      }
    }
  }
`);

const updateProductMediaMetadataMutation = graphql(`
  mutation UpdateProductMediaMetadata($id: ID!, $input: [MetadataInput!]!) {
    updateMetadata(id: $id, input: $input) {
      item {
        __typename
        ... on ProductMedia {
          id
          metadata {
            key
            value
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

const getAttributeByNameQuery = graphql(`
  query GetAttributeByName($name: String!) {
    attributes(filter: { search: $name }, first: 100) {
      edges {
        node {
          id
          name
          entityType
          inputType
          choices(first: 100) {
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

const productBulkCreateMutation = graphql(`
  mutation ProductBulkCreate(
    $products: [ProductBulkCreateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    productBulkCreate(
      products: $products
      errorPolicy: $errorPolicy
    ) {
      count
      results {
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
          media {
            id
            alt
            type
            url
            metadata {
              key
              value
            }
          }
        }
        errors {
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);

const productVariantBulkCreateMutation = graphql(`
  mutation ProductVariantBulkCreate(
    $variants: [ProductVariantBulkCreateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    productVariantBulkCreate(
      variants: $variants
      errorPolicy: $errorPolicy
    ) {
      count
      results {
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
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);

const productVariantBulkUpdateMutation = graphql(`
  mutation ProductVariantBulkUpdate(
    $variants: [ProductVariantBulkUpdateInput!]!
    $errorPolicy: ErrorPolicyEnum
  ) {
    productVariantBulkUpdate(
      variants: $variants
      errorPolicy: $errorPolicy
    ) {
      count
      results {
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
          path
          message
          code
        }
      }
      errors {
        path
        message
        code
      }
    }
  }
`);

const getChannelBySlugQuery = graphql(`
  query GetChannelBySlug($slug: String!) {
    channels {
      id
      name
      slug
      currencyCode
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
      variant {
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

export type ProductMedia = NonNullable<
  NonNullable<ResultOf<typeof createProductMediaMutation>["productMediaCreate"]>["media"]
>;

export type ProductMediaCreateInput = VariablesOf<typeof createProductMediaMutation>["input"];

export type ProductMediaUpdateInput = VariablesOf<typeof updateProductMediaMutation>["input"];

export type ProductMediaDeleteInput = VariablesOf<typeof deleteProductMediaMutation>["id"];

export type ProductVariantWithChannelListings = NonNullable<
  NonNullable<
    ResultOf<
      typeof productVariantChannelListingUpdateMutation
    >["productVariantChannelListingUpdate"]
  >["variant"]
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

  getProductsBySlugs(slugs: string[]): Promise<Product[]>;
  getProductVariantBySku(sku: string): Promise<ProductVariant | null>;
  getProductTypeByName(name: string): Promise<{ id: string; name: string } | null>;
  getCategoryByName(name: string): Promise<{ id: string; name: string } | null>;
  getCategoryBySlug(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    parent?: { slug?: string | null } | null;
  } | null>;
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
  listProductMedia(productId: string): Promise<ProductMedia[]>;
  createProductMedia(input: ProductMediaCreateInput): Promise<ProductMedia>;
  updateProductMedia(id: string, input: ProductMediaUpdateInput): Promise<ProductMedia>;
  deleteProductMedia(id: string): Promise<void>;
  replaceAllProductMedia(
    productId: string,
    mediaInputs: ProductMediaCreateInput[]
  ): Promise<ProductMedia[]>;

  // Bulk operations
  bulkCreateProducts(input: ProductBulkCreateInput): Promise<ProductBulkCreateResult>;
  bulkCreateVariants(input: ProductVariantBulkCreateInput): Promise<ProductVariantBulkCreateResult>;
  bulkUpdateVariants(input: ProductVariantBulkUpdateInput): Promise<ProductVariantBulkUpdateResult>;
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

  async getProductsBySlugs(slugs: string[]): Promise<Product[]> {
    if (slugs.length === 0) {
      return [];
    }

    const result = await this.client.query(getProductsBySlugsBulkQuery, {
      slugs,
    });

    if (result.error) {
      throw new Error(`Failed to fetch products by slugs: ${result.error.message}`);
    }

    if (!result.data?.products?.edges) {
      return [];
    }

    return result.data.products.edges
      .map((edge) => edge.node)
      .filter((node): node is Product => node !== null);
  }

  async getProductTypeByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await this.client.query(getProductTypeByNameQuery, { name });

    const edges = result.data?.productTypes?.edges ?? [];
    // Prefer exact name match to avoid duplicates
    const exactMatch = edges.find((edge) => edge.node?.name === name);
    if (exactMatch?.node) {
      return exactMatch.node;
    }

    const normalizedName = name.trim().toLowerCase();
    const caseInsensitiveMatch = edges.find(
      (edge) => edge.node?.name?.trim().toLowerCase() === normalizedName
    );
    if (caseInsensitiveMatch?.node) {
      return caseInsensitiveMatch.node;
    }

    const slug = slugify(name);
    if (!slug) {
      return null;
    }

    const slugResult = await this.client.query(getProductTypeBySlugQuery, { slug });
    const slugMatch = slugResult.data?.productTypes?.edges?.find((edge) => edge.node)?.node;

    return slugMatch ?? null;
  }

  async getCategoryByName(name: string): Promise<{ id: string; name: string } | null> {
    const result = await this.client.query(getCategoryByNameQuery, { name });

    // Find exact match among search results to prevent duplicate creation
    const exactMatch = result.data?.categories?.edges?.find((edge) => edge.node?.name === name);

    return exactMatch?.node || null;
  }

  async getCategoryBySlug(slug: string): Promise<{
    id: string;
    name: string;
    slug: string;
    parent?: { slug?: string | null } | null;
  } | null> {
    logger.debug("Looking up category by slug", { slug });

    const result = await this.client.query(getCategoryBySlugQuery, { slug });

    let category = result.data?.category;

    if (category) {
      logger.debug("Found category by slug", {
        id: category.id,
        name: category.name,
        slug: category.slug,
      });
    } else {
      logger.debug("No category found with slug via direct lookup, falling back to list", { slug });
      try {
        const all = await this.client.query(getCategoryByNameQuery, { name: slug });
        // If API doesn't support direct slug filter, search edges for exact slug
        const edges = all.data?.categories?.edges ?? [];
        category = edges.find((e) => e.node?.slug === slug)?.node as typeof category;
        if (!category) {
          // Final fallback: query all categories-like via product repository not available; rely on category service elsewhere
        }
      } catch {
        // ignore
      }
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

    // Find the final category
    const finalCategorySlug = slugParts[slugParts.length - 1];
    let current = await this.getCategoryBySlug(finalCategorySlug);

    if (!current) {
      logger.warn("Category not found by final slug", { path, finalSlug: finalCategorySlug });
      return null;
    }

    // Verify the parent chain matches the provided path (from child up to root)
    for (let i = slugParts.length - 2; i >= 0; i--) {
      const expectedParentSlug = slugParts[i];
      // Fetch the parent one level up if needed
      const parentSlug = (current?.parent?.slug as string | undefined) || undefined;
      if (!parentSlug) {
        logger.warn("Category hierarchy mismatch: missing parent", {
          path,
          at: current.slug,
          expectedParentSlug,
        });
        return null;
      }
      if (parentSlug !== expectedParentSlug) {
        logger.warn("Category hierarchy mismatch", {
          path,
          at: current.slug,
          expectedParentSlug,
          actualParentSlug: parentSlug,
        });
        return null;
      }

      // Move up one level for the next comparison (if we need to verify more)
      current = await this.getCategoryBySlug(parentSlug);
      if (!current) {
        logger.warn("Failed to fetch parent during hierarchy verification", { parentSlug });
        return null;
      }
    }

    return await this.getCategoryBySlug(finalCategorySlug);
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

    // channels is an array in this schema; find exact slug match
    const channels = result.data?.channels as Channel[] | undefined;
    const channel = channels?.find((c) => c?.slug === slug) || null;

    if (channel) {
      logger.debug("Found channel", { id: channel.id, slug: channel.slug, name: channel.name });
    } else {
      logger.debug("No channel found with slug", { slug });
    }

    return channel;
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

    if (!result.data?.productVariantChannelListingUpdate?.variant) {
      const businessErrors = result.data?.productVariantChannelListingUpdate?.errors;
      if (businessErrors && Array.isArray(businessErrors) && businessErrors.length > 0) {
        const errorMessage = businessErrors.map((e) => e.message).join(", ");
        throw new Error(`Failed to update variant channel listings: ${errorMessage}`);
      }
      logger.warn("Variant channel listings update returned no variant", { variantId: id });
      return null;
    }

    const variant = result.data.productVariantChannelListingUpdate.variant as ProductVariant;

    logger.debug("Product variant channel listings updated", {
      variantId: variant.id,
      channelListings: variant.channelListings?.length || 0,
    });

    return variant;
  }

  async listProductMedia(productId: string): Promise<ProductMedia[]> {
    logger.debug("Fetching product media", { productId });

    const result = await this.client.query(getProductMediaQuery, { id: productId });

    if (result.error) {
      throw result.error;
    }

    const mediaNodes = result.data?.product?.media ?? [];
    const media = mediaNodes.filter((item): item is ProductMedia => Boolean(item));

    logger.debug("Fetched product media", {
      productId,
      mediaCount: media.length,
    });

    return media;
  }

  async createProductMedia(input: ProductMediaCreateInput): Promise<ProductMedia> {
    logger.debug("Creating product media", {
      productId: input.product,
      mediaUrl: input.mediaUrl,
    });

    const result = await this.client.mutation(createProductMediaMutation, {
      input,
    });

    if (result.error) {
      throw result.error;
    }

    const payload = result.data?.productMediaCreate;
    const businessErrors = payload?.errors;

    if (businessErrors && businessErrors.length > 0) {
      const errorMessage = businessErrors.map((e) => e.message).join(", ");
      throw new Error(`Failed to create product media: ${errorMessage}`);
    }

    if (!payload?.media) {
      throw new Error("Failed to create product media: Unknown error");
    }

    logger.debug("Created product media", {
      mediaId: payload.media.id,
      productId: input.product,
    });

    return payload.media as ProductMedia;
  }

  private async setProductMediaSourceUrlMetadata(
    mediaId: string,
    mediaUrl: string | null | undefined
  ): Promise<void> {
    const trimmedUrl = mediaUrl?.trim();
    if (!trimmedUrl) {
      return;
    }

    logger.debug("Persisting product media source URL metadata", {
      mediaId,
    });

    const result = await this.client.mutation(updateProductMediaMetadataMutation, {
      id: mediaId,
      input: [
        {
          key: PRODUCT_MEDIA_SOURCE_METADATA_KEY,
          value: trimmedUrl,
        },
      ],
    });

    if (result.error) {
      throw result.error;
    }

    const payload = result.data?.updateMetadata;
    const errors = payload?.errors ?? [];

    if (errors.length > 0) {
      const errorMessage = errors
        .map((error) => error.message)
        .filter((message): message is string => Boolean(message?.trim()))
        .join(", ");

      throw new Error(
        `Failed to persist product media metadata for ${mediaId}: ${
          errorMessage || "Unknown error"
        }`
      );
    }
  }

  async updateProductMedia(id: string, input: ProductMediaUpdateInput): Promise<ProductMedia> {
    logger.debug("Updating product media", { mediaId: id, input });

    const result = await this.client.mutation(updateProductMediaMutation, {
      id,
      input,
    });

    if (result.error) {
      throw result.error;
    }

    const payload = result.data?.productMediaUpdate;
    const businessErrors = payload?.errors;

    if (businessErrors && businessErrors.length > 0) {
      const errorMessage = businessErrors.map((e) => e.message).join(", ");
      throw new Error(`Failed to update product media: ${errorMessage}`);
    }

    if (!payload?.media) {
      throw new Error("Failed to update product media: Unknown error");
    }

    logger.debug("Updated product media", {
      mediaId: payload.media.id,
    });

    return payload.media as ProductMedia;
  }

  async deleteProductMedia(id: string): Promise<void> {
    logger.debug("Deleting product media", { mediaId: id });

    const result = await this.client.mutation(deleteProductMediaMutation, {
      id,
    });

    if (result.error) {
      throw result.error;
    }

    const payload = result.data?.productMediaDelete;
    const businessErrors = payload?.errors;

    if (businessErrors && businessErrors.length > 0) {
      const errorMessage = businessErrors.map((e) => e.message).join(", ");
      throw new Error(`Failed to delete product media: ${errorMessage}`);
    }

    logger.debug("Deleted product media", { mediaId: id });
  }

  async replaceAllProductMedia(
    productId: string,
    mediaInputs: ProductMediaCreateInput[]
  ): Promise<ProductMedia[]> {
    logger.debug("Replacing all product media", {
      productId,
      newMediaCount: mediaInputs.length,
    });

    try {
      // Step 1: Fetch existing media
      const existingMedia = await this.listProductMedia(productId);
      logger.debug("Found existing media", {
        productId,
        existingMediaCount: existingMedia.length,
      });

      // Step 2: Delete all existing media
      if (existingMedia.length > 0) {
        logger.debug("Deleting existing media", {
          productId,
          mediaIds: existingMedia.map((m) => m.id),
        });

        // Delete media sequentially to avoid rate limiting issues
        for (const media of existingMedia) {
          try {
            await this.deleteProductMedia(media.id);
          } catch (error) {
            logger.warn("Failed to delete existing media, continuing", {
              mediaId: media.id,
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue with other deletions even if one fails
          }
        }
      }

      // Step 3: Create new media entries
      const createdMedia: ProductMedia[] = [];
      if (mediaInputs.length > 0) {
        logger.debug("Creating new media entries", {
          productId,
          mediaInputs: mediaInputs.map((m) => m.mediaUrl),
        });

        // Create media sequentially to maintain order and avoid rate limiting
        for (const mediaInput of mediaInputs) {
          try {
            const createdMediaItem = await this.createProductMedia(mediaInput);
            await this.setProductMediaSourceUrlMetadata(createdMediaItem.id, mediaInput.mediaUrl);
            createdMedia.push(createdMediaItem);
          } catch (error) {
            logger.error("Failed to create new media", {
              productId,
              mediaUrl: mediaInput.mediaUrl,
              error: error instanceof Error ? error.message : String(error),
            });
            // If creation fails, we should still continue with remaining media
            // The partial success is better than complete failure
          }
        }
      }

      logger.debug("Product media replacement completed", {
        productId,
        deletedCount: existingMedia.length,
        createdCount: createdMedia.length,
      });

      return createdMedia;
    } catch (error) {
      logger.error("Failed to replace product media", {
        productId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to replace product media for product ${productId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Bulk operations
  async bulkCreateProducts(input: ProductBulkCreateInput): Promise<ProductBulkCreateResult> {
    const result = await this.client.mutation(productBulkCreateMutation, input);

    if (!result.data?.productBulkCreate) {
      // Handle GraphQL errors
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw new Error(
          `GraphQL errors during bulk product creation: ${result.error.graphQLErrors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      // Handle network errors
      if (result.error) {
        throw new Error(`Network error during bulk product creation: ${result.error.message}`);
      }

      throw new Error("Failed to bulk create products");
    }

    logger.info(`Bulk created ${result.data.productBulkCreate.count} products`);

    return result.data.productBulkCreate as ProductBulkCreateResult;
  }

  async bulkCreateVariants(
    input: ProductVariantBulkCreateInput
  ): Promise<ProductVariantBulkCreateResult> {
    const result = await this.client.mutation(productVariantBulkCreateMutation, input);

    if (!result.data?.productVariantBulkCreate) {
      // Handle GraphQL errors
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw new Error(
          `GraphQL errors during bulk variant creation: ${result.error.graphQLErrors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      // Handle network errors
      if (result.error) {
        throw new Error(`Network error during bulk variant creation: ${result.error.message}`);
      }

      throw new Error("Failed to bulk create product variants");
    }

    logger.info(`Bulk created ${result.data.productVariantBulkCreate.count} product variants`);

    return result.data.productVariantBulkCreate as ProductVariantBulkCreateResult;
  }

  async bulkUpdateVariants(
    input: ProductVariantBulkUpdateInput
  ): Promise<ProductVariantBulkUpdateResult> {
    const result = await this.client.mutation(productVariantBulkUpdateMutation, input);

    if (!result.data?.productVariantBulkUpdate) {
      // Handle GraphQL errors
      if (result.error?.graphQLErrors && result.error.graphQLErrors.length > 0) {
        throw new Error(
          `GraphQL errors during bulk variant update: ${result.error.graphQLErrors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      // Handle network errors
      if (result.error) {
        throw new Error(`Network error during bulk variant update: ${result.error.message}`);
      }

      throw new Error("Failed to bulk update product variants");
    }

    logger.info(`Bulk updated ${result.data.productVariantBulkUpdate.count} product variants`);

    return result.data.productVariantBulkUpdate as ProductVariantBulkUpdateResult;
  }
}
