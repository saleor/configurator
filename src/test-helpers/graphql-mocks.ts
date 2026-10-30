import type { GraphQLFetchOptions } from "./types";

// Helper to create proper Response objects for urql compatibility
function createMockResponse(data: unknown, status = 200): Response {
  const responseText = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    url: "",
    redirected: false,
    type: "basic" as ResponseType,
    body: null,
    bodyUsed: false,

    // Essential methods that urql's fetch exchange uses
    text: () => Promise.resolve(responseText),
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob([responseText])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    clone: function () {
      return this;
    },
  } as Response;
}

// Enhanced fetch mock for vitest tests
export function createFetchMock() {
  return async (_url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    try {
      // Parse the GraphQL request to determine what to mock
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const query = body.query || "";

      // Handle GraphQL introspection queries (used by GraphQL client internally)
      if (query.includes("__schema") || query.includes("IntrospectionQuery")) {
        return createMockResponse({
          data: {
            __schema: {
              queryType: { name: "Query" },
              mutationType: { name: "Mutation" },
              subscriptionType: null,
              types: [
                {
                  kind: "OBJECT",
                  name: "Shop",
                  fields: [{ name: "defaultMailSenderName", type: { name: "String" } }],
                },
                {
                  kind: "OBJECT",
                  name: "Channel",
                  fields: [
                    { name: "name", type: { name: "String" } },
                    { name: "slug", type: { name: "String" } },
                  ],
                },
              ],
            },
          },
        });
      }

      // Handle specific GraphQL operations based on query content
      if (query.includes("productTypeCreate") || query.includes("ProductTypeCreate")) {
        return createMockResponse({
          data: {
            productTypeCreate: {
              productType: {
                id: `product-type-${Math.random().toString(36).substring(7)}`,
                name: "Mock Product Type",
                slug: "mock-product-type",
                hasVariants: true,
                kind: "NORMAL",
              },
              errors: [],
            },
          },
        });
      }

      if (query.includes("pageTypeCreate") || query.includes("PageTypeCreate")) {
        return createMockResponse({
          data: {
            pageTypeCreate: {
              pageType: {
                id: `page-type-${Math.random().toString(36).substring(7)}`,
                name: "Mock Page Type",
                slug: "mock-page-type",
              },
              errors: [],
            },
          },
        });
      }

      if (query.includes("categoryCreate") || query.includes("CategoryCreate")) {
        return createMockResponse({
          data: {
            categoryCreate: {
              category: {
                id: `category-${Math.random().toString(36).substring(7)}`,
                name: "Mock Category",
                slug: "mock-category",
                description: "Mock category description",
              },
              errors: [],
            },
          },
        });
      }

      // Handle authentication errors
      if (
        options?.headers &&
        typeof options.headers === "object" &&
        "authorization" in options.headers &&
        (options.headers as GraphQLFetchOptions["headers"] as Record<string, string>)
          .authorization === "Bearer invalid-token"
      ) {
        return createMockResponse(
          {
            errors: [
              {
                message: "Authentication credentials were not provided.",
                extensions: { code: "UNAUTHENTICATED" },
              },
            ],
          },
          401
        );
      }

      // Default introspection response for diff queries
      if (
        query.includes("shop") ||
        query.includes("channels") ||
        body.operationName === "GetConfig"
      ) {
        return createMockResponse({
          data: {
            shop: {
              defaultMailSenderName: "Current Shop Name",
              defaultMailSenderAddress: "noreply@test.com",
              displayGrossPrices: true,
              enableAccountConfirmationByEmail: true,
              limitQuantityPerCheckout: null,
              trackInventoryByDefault: true,
              reserveStockDurationAnonymousUser: 10,
              reserveStockDurationAuthenticatedUser: 10,
              defaultWeightUnit: "KG",
              allowLoginWithoutConfirmation: false,
            },
            channels: [
              {
                id: "channel-1",
                name: "Default Channel",
                slug: "default-channel",
                currencyCode: "USD",
                defaultCountry: { code: "US" },
                checkoutSettings: {
                  useLegacyErrorFlow: false,
                  automaticallyCompleteFullyPaidCheckouts: true,
                },
                paymentSettings: {
                  defaultTransactionFlowStrategy: "CHARGE",
                },
                stockSettings: {
                  allocationStrategy: "PRIORITIZE_SORTING_ORDER",
                },
                orderSettings: {
                  automaticallyConfirmAllNewOrders: true,
                  automaticallyFulfillNonShippableGiftCard: true,
                  expireOrdersAfter: "30",
                  deleteExpiredOrdersAfter: "60",
                  markAsPaidStrategy: "PAYMENT_FLOW",
                  allowUnpaidOrders: false,
                  includeDraftOrderInVoucherUsage: false,
                },
              },
            ],
            productTypes: { edges: [] },
            pageTypes: { edges: [] },
          },
        });
      }

      // Default success response for mutations
      return createMockResponse({
        data: {
          shopSettingsUpdate: {
            shop: { defaultMailSenderName: "Updated Shop Name" },
            errors: [],
          },
          channelCreate: {
            channel: {
              id: "new-channel-1",
              name: "New Channel",
              slug: "new-channel",
              isActive: false,
            },
            errors: [],
          },
        },
      });
    } catch (error) {
      // Return error response
      return createMockResponse(
        {
          errors: [{ message: `GraphQL Error: ${error}` }],
        },
        400
      );
    }
  };
}
