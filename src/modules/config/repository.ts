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
          variantAttributes {
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
    categories(first: 100) {
      edges {
        node {
          id
          name
          parent {
            id
            name
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
      const errorMessage = result.error.message;
      
      // Handle common error patterns with helpful suggestions
      if (errorMessage.includes('[Network] Forbidden') || errorMessage.includes('403')) {
        throw new Error(
          `GraphQL Error: Forbidden (403)\n\n` +
          `This usually means:\n` +
          `  • Your URL is missing the /graphql/ endpoint\n` +
          `    Expected format: https://your-store.saleor.cloud/graphql/\n` +
          `  • Your authentication token is invalid or expired\n` +
          `  • Your token doesn't have the required permissions\n\n` +
          `💡 Try adding /graphql/ to your URL if it's missing`
        );
      }
      
      if (errorMessage.includes('[Network]') && errorMessage.includes('404')) {
        throw new Error(
          `GraphQL Error: Not Found (404)\n\n` +
          `This usually means:\n` +
          `  • Your URL is incorrect or missing the /graphql/ endpoint\n` +
          `    Expected format: https://your-store.saleor.cloud/graphql/\n` +
          `  • The Saleor instance doesn't exist at this URL\n\n` +
          `💡 Check your URL and ensure it ends with /graphql/`
        );
      }
      
      if (errorMessage.includes('[Network]') && (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED'))) {
        throw new Error(
          `GraphQL Error: Connection Failed\n\n` +
          `This usually means:\n` +
          `  • Network connectivity issues\n` +
          `  • Invalid domain name in URL\n` +
          `  • Firewall blocking the connection\n\n` +
          `💡 Check your network connection and URL`
        );
      }
      
      if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
        throw new Error(
          `GraphQL Error: Unauthorized (401)\n\n` +
          `This usually means:\n` +
          `  • Your authentication token is missing or invalid\n` +
          `  • Your token has expired\n\n` +
          `💡 Check your token and regenerate it if necessary`
        );
      }
      
      // Fallback for other GraphQL errors
      throw new Error(`GraphQL Error: ${errorMessage}`);
    }

    if (!result.data) {
      throw new Error("Failed to fetch config: No data returned from GraphQL query");
    }

    return result.data;
  }
}
