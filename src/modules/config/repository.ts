import type { Client, CombinedError } from "@urql/core";
import { graphql, type ResultOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";

// @ts-ignore - Large query type can exceed TS instantiation limits; runtime types remain intact
const getConfigQuery = graphql(`
  query GetConfig {
    shop {
      defaultMailSenderName
      defaultMailSenderAddress
      displayGrossPrices
      enableAccountConfirmationByEmail
      limitQuantityPerCheckout
      trackInventoryByDefault
      reserveStockDurationAnonymousUser
      reserveStockDurationAuthenticatedUser
      defaultDigitalMaxDownloads
      defaultDigitalUrlValidDays
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
            choices(first: 100) {
              edges {
                node {
                  name
                }
              }
            }
          }
          assignedVariantAttributes {
            attribute {
              id
              name
              type
              inputType
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
      edges {
        node {
          id
          name
          attributes {
            id
            name
            type
            inputType
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

export type RawSaleorConfig = ResultOf<typeof getConfigQuery>;

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

    // Fetch all products with pagination to avoid first: N truncation
    // Fetch sequentially with delays to avoid rate limiting
    try {
      // Add a small delay between major queries to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));

      const allProductEdges = await this.fetchAllProducts();

      // Another small delay before fetching attributes
      await new Promise((resolve) => setTimeout(resolve, 100));

      const fullAttributes = await this.fetchAllAttributes();

      const data: RawSaleorConfig = {
        ...(result.data as RawSaleorConfig),
        products: {
          edges: allProductEdges,
        },
        attributes: fullAttributes,
      } as RawSaleorConfig;
      return data;
    } catch (_e) {
      // If pagination fails, fall back to the original data
      return result.data as RawSaleorConfig;
    }
  }

  private async fetchAllProducts() {
    type ProductsEdges = NonNullable<RawSaleorConfig["products"]>["edges"];
    const edges: ProductsEdges = [] as unknown as ProductsEdges;
    let after: string | null = null;
    // Use page size 100 (Saleor default max) and paginate
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

    // Loop
    type ProductsPageResult = {
      data?: {
        products?: {
          pageInfo?: { endCursor: string | null; hasNextPage: boolean } | null;
          edges?: NonNullable<RawSaleorConfig["products"]>["edges"];
        } | null;
      };
      error?: CombinedError;
    };
    for (;;) {
      const res: ProductsPageResult = await this.client.query(pageQuery, { first: 100, after });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch products page", res.error);
      }
      const page = res.data?.products;
      if (!page) break;
      const pageEdges = (page.edges || []) as unknown as ProductsEdges;
      edges.push(...(pageEdges || []));
      if (!page.pageInfo?.hasNextPage) break;
      after = page.pageInfo.endCursor || null;

      // Add a delay between pagination requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return edges;
  }

  /**
   * Fetch all attributes with complete choice lists (no 100-item cap)
   */
  private async fetchAllAttributes(): Promise<NonNullable<RawSaleorConfig["attributes"]>> {
    const edges: RawAttributeEdge[] = [];
    let after: string | null = null;

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

    // Loop over attributes pages
    for (;;) {
      type AttributesPageResult = {
        error?: CombinedError;
        data?: {
          attributes?: {
            pageInfo?: { endCursor?: string | null; hasNextPage: boolean } | null;
            edges?: RawAttributeEdge[] | null;
          } | null;
        };
      };
      const res: AttributesPageResult = await this.client.query(attributesPageQuery, {
        first: 100,
        after,
      });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch attributes page", res.error);
      }
      const page = res.data?.attributes;
      const pageEdges = page?.edges ?? [];

      for (const edge of pageEdges) {
        if (!edge?.node?.id) {
          edges.push(edge as RawAttributeEdge);
          continue;
        }
        const { node } = edge;
        const normalizedEdge = {
          ...edge,
          node: {
            ...node,
            choices: {
              ...(node.choices ?? {}),
              edges: [] as RawAttributeChoiceEdge[],
            },
          },
        } as RawAttributeEdge;
        edges.push(normalizedEdge);
      }
      if (!page?.pageInfo?.hasNextPage) break;
      after = page.pageInfo?.endCursor ?? null;

      // Add a delay between attribute pagination requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

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
    const choices: RawAttributeChoiceEdge[] = [];
    let after: string | null = null;

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

    for (;;) {
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
      const res: ChoicesPageResult = await this.client.query(choicesPageQuery, {
        id: attributeId,
        first: 100,
        after,
      });
      if (res.error) {
        throw GraphQLError.fromCombinedError("Failed to fetch attribute choices", res.error);
      }
      const page = res.data?.attribute?.choices;
      const pageEdges = page?.edges ?? [];
      choices.push(...pageEdges);
      if (!page?.pageInfo?.hasNextPage) break;
      after = page.pageInfo?.endCursor ?? null;
    }

    return choices;
  }
}
