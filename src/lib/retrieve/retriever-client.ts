import type { Client } from "@urql/core";
import { graphql, type ResultOf } from "gql.tada";

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
      companyAddress {
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
    attributes(first: 100) {
      edges {
        node {
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
`);

export type RawSaleorConfig = ResultOf<typeof getConfigQuery>;

export class RetrieverClient {
  constructor(private client: Client) {}

  async fetchConfig() {
    const result = await this.client.query(getConfigQuery, {});

    if (!result.data) {
      throw new Error("Failed to fetch config");
    }

    return result.data;
  }
}
