import type { Client } from "@urql/core";
import { graphql, type ResultOf } from "gql.tada";
import type { CombinedError } from "@urql/core";
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
            choices(first: 10) {
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
              choices(first: 10) {
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
            choices(first: 10) {
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
        }
      }
    }
  }
`);

export type RawSaleorConfig = ResultOf<typeof getConfigQuery>;

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
    try {
      const allProductEdges = await this.fetchAllProducts();
      const data: RawSaleorConfig = {
        ...(result.data as RawSaleorConfig),
        products: {
          edges: allProductEdges,
        },
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
              productType { id name }
              category { id name slug }
              taxClass { id name }
              attributes {
                attribute { id name slug inputType }
                values { id name slug value }
              }
              variants {
                id
                name
                sku
                weight { unit value }
                attributes {
                  attribute { id name slug inputType }
                  values { id name slug value }
                }
                channelListings {
                  id
                  channel { id slug }
                  price { amount currency }
                  costPrice { amount currency }
                }
              }
              channelListings {
                id
                channel { id slug }
                isPublished
                publishedAt
                visibleInListings
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
    }

    return edges;
  }
}
