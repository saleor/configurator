import type { Client } from "@urql/core";
import { graphql, type ResultOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";

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

    return result.data;
  }
}
