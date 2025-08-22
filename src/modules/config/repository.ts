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
    productTypes(first: 100) {
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
    pageTypes(first: 100) {
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
    categories(first: 100) {
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
    warehouses(first: 100) {
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
          shippingZones(first: 100) {
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
    shippingZones(first: 100) {
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
    taxClasses(first: 100) {
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
