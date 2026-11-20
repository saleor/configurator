import type { Client, CombinedError } from "@urql/core";
import { graphql, type ResultOf, type TadaDocumentNode } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import {
  type ConnectionPage,
  fetchAllPages,
  MAX_PAGE_SIZE,
} from "../../lib/graphql/fetch-all-pages";
import { logger } from "../../lib/logger";

// @ts-ignore - Large query type can exceed TS instantiation limits; runtime types remain intact
const getConfigQuery = graphql(`
  query GetConfig {
    shop {
      schemaVersion
      defaultMailSenderName
      defaultMailSenderAddress
      displayGrossPrices
      enableAccountConfirmationByEmail
      limitQuantityPerCheckout
      trackInventoryByDefault
      useLegacyShippingZoneStockAvailability
      reserveStockDurationAnonymousUser
      reserveStockDurationAuthenticatedUser
      defaultWeightUnit
      allowLoginWithoutConfirmation
    }
    channels {
      id
      name
      isActive
      currencyCode
      defaultCountry {
        code
      }
      slug
      checkoutSettings {
        useLegacyErrorFlow
        automaticallyCompleteFullyPaidCheckouts
      }
      paymentSettings {
        defaultTransactionFlowStrategy
      }
      stockSettings {
        allocationStrategy
      }
      orderSettings {
        automaticallyConfirmAllNewOrders
        automaticallyFulfillNonShippableGiftCard
        expireOrdersAfter
        deleteExpiredOrdersAfter
        markAsPaidStrategy
        allowUnpaidOrders
        includeDraftOrderInVoucherUsage
      }
    }
    productTypes(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          isShippingRequired
          productAttributes {
            id
            name
            type
            inputType
            entityType
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
          assignedVariantAttributes {
            variantSelection
            attribute {
              id
              name
              type
              inputType
              entityType
              choices(first: 100) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
    pageTypes(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          attributes {
            id
            name
            type
            inputType
            entityType
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
    categories(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            slug
          }
        }
      }
    }
    warehouses(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          email
          isPrivate
          clickAndCollectOption
          address {
            streetAddress1
            streetAddress2
            city
            cityArea
            postalCode
            country {
              code
            }
            countryArea
            companyName
            phone
          }
          shippingZones(first: 50) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    }
    shippingZones(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          default
          description
          countries {
            code
          }
          channels {
            id
            slug
          }
          warehouses {
            id
            slug
          }
          shippingMethods {
            id
            name
            description
            type
            maximumDeliveryDays
            minimumDeliveryDays
            maximumOrderWeight {
              unit
              value
            }
            minimumOrderWeight {
              unit
              value
            }
            channelListings {
              channel {
                slug
              }
              price {
                amount
                currency
              }
              maximumOrderPrice {
                amount
                currency
              }
              minimumOrderPrice {
                amount
                currency
              }
            }
          }
        }
      }
    }
    taxClasses(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          countries {
            country {
              code
            }
            rate
            taxClass {
              id
              name
            }
          }
        }
      }
    }
    collections(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
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
          products(first: 20) {
            pageInfo {
              endCursor
              hasNextPage
            }
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
    menus(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          items {
            id
            name
            menu {
              id
            }
            parent {
              id
              name
            }
            category {
              id
              slug
              name
            }
            collection {
              id
              slug
              name
            }
            page {
              id
              slug
              title
            }
            level
            children {
              id
              name
              url
              category {
                id
                slug
              }
              collection {
                id
                slug
              }
              page {
                id
                slug
              }
            }
            url
          }
        }
      }
    }
    attributes(first: 100) {
      edges {
        node {
          id
          name
          slug
          type
          inputType
          entityType
          choices(first: 100) {
            pageInfo { endCursor hasNextPage }
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
    pages(first: 50) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          title
          slug
          content
          isPublished
          publishedAt
          pageType {
            id
            name
            attributes {
              id
              name
              type
              inputType
              choices(first: 10) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
          attributes {
            attribute {
              id
              slug
              name
              type
              inputType
            }
            values {
              id
              name
              slug
              value
            }
          }
        }
      }
    }
    products(first: 100) {
      edges {
        node {
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
            slug
          }
          taxClass {
            id
            name
          }
          attributes {
            attribute {
              id
              name
              slug
              inputType
            }
            values {
              id
              name
              slug
              value
            }
          }
          variants {
            id
            name
            sku
            weight {
              unit
              value
            }
            attributes {
              attribute {
                id
                name
                slug
                inputType
              }
              values {
                id
                name
                slug
                value
              }
            }
            channelListings {
              id
              channel {
                id
                slug
              }
              price {
                amount
                currency
              }
              costPrice {
                amount
                currency
              }
            }
          }
          channelListings {
            id
            channel {
              id
              slug
            }
            isPublished
            publishedAt
            visibleInListings
            isAvailableForPurchase
            availableForPurchaseAt
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

/**
 * Follow-up pages for the lists in the main query. Their selections must match
 * the main query's (enforced by a test), so every page yields the same shape.
 */
const getProductTypesPageQuery = graphql(`
  query GetConfigProductTypesPage($first: Int!, $after: String) {
    productTypes(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          isShippingRequired
          productAttributes {
            id
            name
            type
            inputType
            entityType
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
          assignedVariantAttributes {
            variantSelection
            attribute {
              id
              name
              type
              inputType
              entityType
              choices(first: 100) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

const getPageTypesPageQuery = graphql(`
  query GetConfigPageTypesPage($first: Int!, $after: String) {
    pageTypes(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          attributes {
            id
            name
            type
            inputType
            entityType
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`);

const getCategoriesPageQuery = graphql(`
  query GetConfigCategoriesPage($first: Int!, $after: String) {
    categories(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          level
          parent {
            id
            slug
          }
        }
      }
    }
  }
`);

const getWarehousesPageQuery = graphql(`
  query GetConfigWarehousesPage($first: Int!, $after: String) {
    warehouses(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          email
          isPrivate
          clickAndCollectOption
          address {
            streetAddress1
            streetAddress2
            city
            cityArea
            postalCode
            country {
              code
            }
            countryArea
            companyName
            phone
          }
          shippingZones(first: 50) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      }
    }
  }
`);

const getShippingZonesPageQuery = graphql(`
  query GetConfigShippingZonesPage($first: Int!, $after: String) {
    shippingZones(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          default
          description
          countries {
            code
          }
          channels {
            id
            slug
          }
          warehouses {
            id
            slug
          }
          shippingMethods {
            id
            name
            description
            type
            maximumDeliveryDays
            minimumDeliveryDays
            maximumOrderWeight {
              unit
              value
            }
            minimumOrderWeight {
              unit
              value
            }
            channelListings {
              channel {
                slug
              }
              price {
                amount
                currency
              }
              maximumOrderPrice {
                amount
                currency
              }
              minimumOrderPrice {
                amount
                currency
              }
            }
          }
        }
      }
    }
  }
`);

const getTaxClassesPageQuery = graphql(`
  query GetConfigTaxClassesPage($first: Int!, $after: String) {
    taxClasses(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          countries {
            country {
              code
            }
            rate
            taxClass {
              id
              name
            }
          }
        }
      }
    }
  }
`);

const getCollectionsPageQuery = graphql(`
  query GetConfigCollectionsPage($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
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
          products(first: 20) {
            pageInfo {
              endCursor
              hasNextPage
            }
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

const getMenusPageQuery = graphql(`
  query GetConfigMenusPage($first: Int!, $after: String) {
    menus(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          items {
            id
            name
            menu {
              id
            }
            parent {
              id
              name
            }
            category {
              id
              slug
              name
            }
            collection {
              id
              slug
              name
            }
            page {
              id
              slug
              title
            }
            level
            children {
              id
              name
              url
              category {
                id
                slug
              }
              collection {
                id
                slug
              }
              page {
                id
                slug
              }
            }
            url
          }
        }
      }
    }
  }
`);

const getPagesPageQuery = graphql(`
  query GetConfigPagesPage($first: Int!, $after: String) {
    pages(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          title
          slug
          content
          isPublished
          publishedAt
          pageType {
            id
            name
            attributes {
              id
              name
              type
              inputType
              choices(first: 10) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
          attributes {
            attribute {
              id
              slug
              name
              type
              inputType
            }
            values {
              id
              name
              slug
              value
            }
          }
        }
      }
    }
  }
`);

const getCollectionProductsPageQuery = graphql(`
  query GetConfigCollectionProductsPage($id: ID!, $first: Int!, $after: String) {
    collection(id: $id) {
      products(first: $first, after: $after) {
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            id
            slug
            name
          }
        }
      }
    }
  }
`);

/**
 * Customer types are fetched separately from the main config query: they require
 * MANAGE_CUSTOMER_TYPES_AND_ATTRIBUTES, and a permission error inside the main
 * query would fail the whole introspect for tokens that predate Saleor 3.23.
 */
const getCustomerTypesQuery = graphql(`
  query GetConfigCustomerTypes($first: Int!, $after: String) {
    customerTypes(first: $first, after: $after) {
      pageInfo {
        endCursor
        hasNextPage
      }
      edges {
        node {
          id
          name
          slug
          isDefault
          attributes {
            id
            name
            type
            inputType
            entityType
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`);

type RawCustomerTypesResult = ResultOf<typeof getCustomerTypesQuery>;

type RawCustomerTypeEdges = NonNullable<RawCustomerTypesResult["customerTypes"]>["edges"];

export type RawSaleorConfig = ResultOf<typeof getConfigQuery> & {
  /** Undefined when customer types could not be read (missing permission). */
  customerTypes?: RawCustomerTypeEdges;
};

type PageVariables = { first: number; after?: string | null };

/** A first page from the main query; `edges` holds every entry once completed. */
type RawListPage<TEdge> = { pageInfo?: ConnectionPage<TEdge>["pageInfo"]; edges: TEdge[] };

type RawCollectionEdge = NonNullable<RawSaleorConfig["collections"]>["edges"][number];
type RawCollectionProductEdge = NonNullable<
  NonNullable<RawCollectionEdge["node"]>["products"]
>["edges"][number];

type RawAttributeConnection = NonNullable<RawSaleorConfig["attributes"]>;
type RawAttributeEdge = NonNullable<RawAttributeConnection["edges"]>[number];
type RawAttributeNode = NonNullable<RawAttributeEdge>["node"];
type RawAttributeChoiceConnection = NonNullable<NonNullable<RawAttributeNode>["choices"]>;
type RawAttributeChoiceEdge = NonNullable<RawAttributeChoiceConnection["edges"]>[number];

export interface ConfigurationOperations {
  fetchConfig(): Promise<RawSaleorConfig>;
}

export class ConfigurationRepository implements ConfigurationOperations {
  constructor(private client: Client) {}

  async fetchConfig() {
    const result = await this.client.query(getConfigQuery, {});

    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to fetch config", result.error);
    }

    if (!result.data) {
      throw new GraphQLError("Failed to fetch config: No data returned from GraphQL query");
    }

    // Outside the fallback below: a failure here must stop introspect rather than
    // produce a config that silently misses entities.
    const config = await this.completeLists(result.data as RawSaleorConfig);

    // Fetch all products with pagination to avoid first: N truncation
    // Fetch sequentially with delays to avoid rate limiting
    try {
      // Add a small delay between major queries to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      const allProductEdges = await this.fetchAllProducts();

      // Another small delay before fetching attributes
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fullAttributes = await this.fetchAllAttributes();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const customerTypes = await this.fetchCustomerTypes();

      const data: RawSaleorConfig = {
        ...config,
        products: {
          edges: allProductEdges,
        },
        attributes: fullAttributes,
        customerTypes,
      } as RawSaleorConfig;
      return data;
    } catch (error) {
      logger.warn(
        "Paginated fetch failed — falling back to initial query data which may be truncated",
        {
          error: error instanceof Error ? error.message : String(error),
          truncationRisk:
            "Attributes limited to first 100, products limited to first 100. Run introspect again if data appears incomplete.",
        }
      );
      return config;
    }
  }

  /** Replaces each first-page list from the main query with every entry. */
  private async completeLists(config: RawSaleorConfig): Promise<RawSaleorConfig> {
    // Sequential on purpose: keeps request bursts low, like the product and attribute fetches.
    const productTypes = await this.completeList(
      config.productTypes,
      getProductTypesPageQuery,
      "productTypes"
    );
    const pageTypes = await this.completeList(config.pageTypes, getPageTypesPageQuery, "pageTypes");
    const categories = await this.completeList(
      config.categories,
      getCategoriesPageQuery,
      "categories"
    );
    const warehouses = await this.completeList(
      config.warehouses,
      getWarehousesPageQuery,
      "warehouses"
    );
    const shippingZones = await this.completeList(
      config.shippingZones,
      getShippingZonesPageQuery,
      "shippingZones"
    );
    const taxClasses = await this.completeList(
      config.taxClasses,
      getTaxClassesPageQuery,
      "taxClasses"
    );
    const collections = await this.completeList(
      config.collections,
      getCollectionsPageQuery,
      "collections"
    );
    const menus = await this.completeList(config.menus, getMenusPageQuery, "menus");
    const pages = await this.completeList(config.pages, getPagesPageQuery, "pages");

    return {
      ...config,
      productTypes,
      pageTypes,
      categories,
      warehouses,
      shippingZones,
      taxClasses,
      collections: collections && {
        ...collections,
        edges: await this.withAllCollectionProducts(collections.edges),
      },
      menus,
      pages,
    };
  }

  /** Appends the pages after `firstPage`, read with the matching page query. */
  private async completeList<TEdge, TData>(
    firstPage: RawListPage<TEdge> | null | undefined,
    document: TadaDocumentNode<TData, PageVariables>,
    field: keyof TData & string
  ): Promise<RawListPage<TEdge> | null | undefined> {
    const pageInfo = firstPage?.pageInfo;
    if (!firstPage || !pageInfo?.hasNextPage || !pageInfo.endCursor) {
      return firstPage;
    }

    const remaining = await fetchAllPages(async (after) => {
      const result = await this.client.query(document, { first: MAX_PAGE_SIZE, after });
      if (result.error) {
        throw GraphQLError.fromCombinedError(`Failed to fetch ${field}`, result.error);
      }
      // The page query selects the same fields as the main query, so edges share a shape.
      return result.data?.[field] as ConnectionPage<TEdge> | null | undefined;
    }, pageInfo.endCursor);

    return { ...firstPage, edges: [...firstPage.edges, ...remaining] };
  }

  /** Collections come with their first 20 products; this reads the rest. */
  private async withAllCollectionProducts(
    collections: RawCollectionEdge[]
  ): Promise<RawCollectionEdge[]> {
    const complete: RawCollectionEdge[] = [];
    for (const edge of collections) {
      const products = edge.node?.products;
      const pageInfo = products?.pageInfo;
      if (!edge.node || !products || !pageInfo?.hasNextPage || !pageInfo.endCursor) {
        complete.push(edge);
        continue;
      }
      const remaining = await this.fetchCollectionProducts(edge.node.id, pageInfo.endCursor);
      complete.push({
        ...edge,
        node: {
          ...edge.node,
          products: { ...products, edges: [...products.edges, ...remaining] },
        },
      });
    }
    return complete;
  }

  private async fetchCollectionProducts(
    collectionId: string,
    after: string
  ): Promise<RawCollectionProductEdge[]> {
    return fetchAllPages(async (cursor) => {
      const result = await this.client.query(getCollectionProductsPageQuery, {
        id: collectionId,
        first: MAX_PAGE_SIZE,
        after: cursor,
      });
      if (result.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch collection products", result.error);
      }
      return result.data?.collection?.products;
    }, after);
  }

  /**
   * Returns undefined (rather than throwing) when the token lacks
   * MANAGE_CUSTOMER_TYPES_AND_ATTRIBUTES, so the rest of introspect still works.
   */
  private async fetchCustomerTypes(): Promise<RawCustomerTypeEdges | undefined> {
    let isForbidden = false;

    const edges = await fetchAllPages(async (after) => {
      const result: {
        error?: CombinedError;
        data?: RawCustomerTypesResult;
      } = await this.client.query(getCustomerTypesQuery, { first: MAX_PAGE_SIZE, after });

      if (result.error) {
        if (GraphQLError.isForbiddenError(result.error)) {
          logger.warn(
            "Skipping customer types: the token lacks MANAGE_CUSTOMER_TYPES_AND_ATTRIBUTES",
            { error: result.error.message }
          );
          isForbidden = true;
          return null;
        }
        throw GraphQLError.fromCombinedError("Failed to fetch customer types", result.error);
      }

      return result.data?.customerTypes;
    });

    return isForbidden ? undefined : edges;
  }

  private async fetchAllProducts() {
    type ProductsEdges = NonNullable<RawSaleorConfig["products"]>["edges"];
    // Define the page query inline to share product node selection with main query
    const pageQuery = graphql(`
      query GetProductsPage($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          pageInfo {
            endCursor
            hasNextPage
          }
          edges {
            node {
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
                slug
              }
              taxClass {
                id
                name
              }
              attributes {
                attribute {
                  id
                  name
                  slug
                  inputType
                }
                values {
                  id
                  name
                  slug
                  value
                }
              }
              variants {
                id
                name
                sku
                weight {
                  unit
                  value
                }
                attributes {
                  attribute {
                    id
                    name
                    slug
                    inputType
                  }
                  values {
                    id
                    name
                    slug
                    value
                  }
                }
                channelListings {
                  id
                  channel {
                    id
                    slug
                  }
                  price {
                    amount
                    currency
                  }
                  costPrice {
                    amount
                    currency
                  }
                }
              }
              channelListings {
                id
                channel {
                  id
                  slug
                }
                isPublished
                publishedAt
                visibleInListings
                isAvailableForPurchase
                availableForPurchaseAt
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

    type ProductsPageResult = {
      data?: {
        products?: {
          pageInfo?: { endCursor: string | null; hasNextPage: boolean } | null;
          edges?: ProductsEdges;
        } | null;
      };
      error?: CombinedError;
    };
    return fetchAllPages(async (after) => {
      const res: ProductsPageResult = await this.client.query(pageQuery, {
        first: MAX_PAGE_SIZE,
        after,
      });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch products page", res.error);
      }
      return res.data?.products;
    });
  }

  /**
   * Fetch all attributes with complete choice lists (no 100-item cap)
   */
  private async fetchAllAttributes(): Promise<NonNullable<RawSaleorConfig["attributes"]>> {
    const attributesPageQuery = graphql(`
      query GetAttributesPage($first: Int!, $after: String) {
        attributes(first: $first, after: $after) {
          pageInfo { endCursor hasNextPage }
          edges {
            node {
              id
              name
              slug
              type
              inputType
              entityType
            }
          }
        }
      }
    `);

    type AttributesPageResult = {
      error?: CombinedError;
      data?: {
        attributes?: {
          pageInfo?: { endCursor?: string | null; hasNextPage: boolean } | null;
          edges?: RawAttributeEdge[] | null;
        } | null;
      };
    };
    const pageEdges = await fetchAllPages(async (after) => {
      const res: AttributesPageResult = await this.client.query(attributesPageQuery, {
        first: MAX_PAGE_SIZE,
        after,
      });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch attributes page", res.error);
      }
      return res.data?.attributes;
    });

    const edges: RawAttributeEdge[] = pageEdges.map((edge) =>
      edge?.node?.id
        ? ({
            ...edge,
            node: {
              ...edge.node,
              choices: {
                ...(edge.node.choices ?? {}),
                edges: [] as RawAttributeChoiceEdge[],
              },
            },
          } as RawAttributeEdge)
        : (edge as RawAttributeEdge)
    );

    // Hydrate choices per attribute with pagination
    const attributeNodes = edges
      .map((edge, index) => ({ edge, index }))
      .filter((item): item is { edge: RawAttributeEdge; index: number } => !!item.edge)
      .map((item) => ({
        index: item.index,
        node: item.edge?.node,
      }))
      .filter(
        (item): item is { index: number; node: RawAttributeNode & { id: string } } =>
          !!item.node?.id
      );

    // Process attributes sequentially with delays to avoid rate limiting
    for (let i = 0; i < attributeNodes.length; i++) {
      const { index, node } = attributeNodes[i];
      const choices = await this.fetchAllChoicesForAttribute(node.id);
      const currentEdge = edges[index];
      if (!currentEdge?.node) continue;
      const existingChoices = currentEdge.node.choices ?? ({} as RawAttributeChoiceConnection);
      edges[index] = {
        ...currentEdge,
        node: {
          ...currentEdge.node,
          choices: {
            ...existingChoices,
            edges: choices,
          },
        },
      } as RawAttributeEdge;

      // Add delay between attribute choice fetches to avoid rate limiting
      if (i < attributeNodes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    return { edges } as NonNullable<RawSaleorConfig["attributes"]>;
  }

  /**
   * Fetch all choices for a given attribute id
   */
  private async fetchAllChoicesForAttribute(
    attributeId: string
  ): Promise<RawAttributeChoiceEdge[]> {
    const choicesPageQuery = graphql(`
      query GetAttributeChoices($id: ID!, $first: Int!, $after: String) {
        attribute(id: $id) {
          choices(first: $first, after: $after) {
            pageInfo { endCursor hasNextPage }
            edges { node { id name value } }
          }
        }
      }
    `);

    type ChoicesPageResult = {
      error?: CombinedError;
      data?: {
        attribute?: {
          choices?: {
            pageInfo?: { endCursor?: string | null; hasNextPage: boolean } | null;
            edges?: RawAttributeChoiceEdge[] | null;
          } | null;
        } | null;
      };
    };
    return fetchAllPages(async (after) => {
      const res: ChoicesPageResult = await this.client.query(choicesPageQuery, {
        id: attributeId,
        first: MAX_PAGE_SIZE,
        after,
      });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch attribute choices", res.error);
      }
      return res.data?.attribute?.choices;
    });
  }
}
