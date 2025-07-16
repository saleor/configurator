import type { MockNock, MockNockScope, GraphQLFetchOptions } from './types';

// Mock nock for tests
const nock: MockNock = (() => {
  const scopes = new Map<string, MockNockScope>();
  
  const createScope = (baseUrl: string): MockNockScope => {
    const scope: MockNockScope = {
      post: () => scope,
      reply: () => scope,
      replyWithError: () => scope,
      persist: () => scope,
      done: () => {},
      isDone: () => true,
    };
    scopes.set(baseUrl, scope);
    return scope;
  };
  
  const mockNock = ((baseUrl: string) => createScope(baseUrl)) as MockNock;
  mockNock.cleanAll = () => scopes.clear();
  mockNock.isActive = () => false;
  mockNock.activate = () => {};
  mockNock.restore = () => {};
  
  return mockNock;
})();

export interface MockGraphQLOptions {
  baseUrl: string;
  endpoint?: string;
}

export interface GraphQLMockResponse {
  data?: unknown;
  errors?: {
    message: string;
    locations?: { line: number; column: number }[];
    path?: (string | number)[];
  }[];
}

// Helper to create proper Response objects for urql compatibility
function createMockResponse(data: unknown, status = 200): Response {
  const responseText = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: new Headers({ 'content-type': 'application/json' }),
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
    clone: function() { return this; },
  } as Response;
}

export class GraphQLMockServer {
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private scope: MockNockScope;

  constructor(options: MockGraphQLOptions) {
    this.baseUrl = options.baseUrl;
    this.endpoint = options.endpoint || "/graphql/";
    
    // Ensure nock is active and configured
    if (!nock.isActive()) {
      nock.activate();
    }
    
    // Clean up any existing mocks first
    nock.cleanAll();
    
    this.scope = nock(this.baseUrl);
  }

  mockOperation(_operationName: string, response: GraphQLMockResponse): this {
    this.scope
      .post(this.endpoint)
      .reply(200, response)
      .persist(); // Allow multiple calls to the same operation
    
    return this;
  }

  mockIntrospection(mockData: {
    shop?: { defaultMailSenderName?: string };
    channels?: { name: string; slug: string; currencyCode: string; defaultCountry?: string }[];
    productTypes?: { edges: unknown[] };
    pageTypes?: { edges: unknown[] };
    categories?: { edges: unknown[] };
  }): this {
    // Mock all GraphQL requests with the introspection response initially
    this.scope
      .post(this.endpoint)
      .reply(200, {
        data: {
          shop: mockData.shop || { defaultMailSenderName: "Test Shop" },
          channels: mockData.channels || [
            { 
              name: "Default Channel", 
              slug: "default-channel", 
              currencyCode: "USD",
              defaultCountry: { code: "US" }
            }
          ],
          productTypes: mockData.productTypes || { edges: [] },
          pageTypes: mockData.pageTypes || { edges: [] },
          categories: mockData.categories || { edges: [] },
        },
      })
      .persist();
    
    return this;
  }

  mockMutation(_mutationName: string, response: GraphQLMockResponse): this {
    this.scope
      .post(this.endpoint)
      .reply(200, response)
      .persist();
    
    return this;
  }

  mockSuccess(): this {
    this.scope
      .post(this.endpoint)
      .reply(200, {
        data: { success: true },
      })
      .persist();
    
    return this;
  }

  mockAuthError(): this {
    // Match any GraphQL request and return auth error
    this.scope
      .post(this.endpoint)
      .reply(401, {
        errors: [{ 
          message: "Authentication required",
          extensions: { code: "UNAUTHORIZED" }
        }],
      })
      .persist();
    
    return this;
  }

  mockNetworkError(): this {
    // Match any GraphQL request and return network error
    this.scope
      .post(this.endpoint)
      .replyWithError({
        code: "ECONNREFUSED",
        message: "Connection refused",
      })
      .persist();
    
    return this;
  }

  mockValidationError(fieldErrors: { field: string; message: string }[]): this {
    this.scope
      .post(this.endpoint)
      .reply(400, {
        errors: fieldErrors.map(error => ({
          message: `Field '${error.field}': ${error.message}`,
          extensions: {
            code: "VALIDATION_ERROR",
            field: error.field,
          },
        })),
      })
      .persist();
    
    return this;
  }

  done(): void {
    this.scope.done();
  }

  isDone(): boolean {
    return this.scope.isDone();
  }

  cleanup(): void {
    this.scope.persist(false);
    nock.cleanAll();
  }
}

// Helper functions for common scenarios
export function mockSuccessfulIntrospection(baseUrl: string): GraphQLMockServer {
  return new GraphQLMockServer({ baseUrl })
    .mockIntrospection({
      shop: { defaultMailSenderName: "Test Shop" },
      channels: [
        { 
          name: "Default Channel", 
          slug: "default-channel", 
          currencyCode: "USD",
          defaultCountry: "US"
        },
        { 
          name: "Mobile Channel", 
          slug: "mobile", 
          currencyCode: "EUR",
          defaultCountry: "DE"
        },
      ],
      productTypes: { edges: [] },
      pageTypes: { edges: [] },
      categories: { edges: [] },
    });
}

export function mockSuccessfulDeployment(baseUrl: string): GraphQLMockServer {
  const server = new GraphQLMockServer({ baseUrl });
  
  // Mock introspection
  server.mockIntrospection({
    shop: { defaultMailSenderName: "Old Shop Name" },
    channels: [{ 
      name: "Old Channel", 
      slug: "old", 
      currencyCode: "USD",
      defaultCountry: "US"
    }],
  });
  
  // Mock successful mutations
  server.mockMutation("shopSettingsUpdate", {
    data: {
      shopSettingsUpdate: {
        shop: { defaultMailSenderName: "New Shop Name" },
        errors: [],
      },
    },
  });
  
  return server;
}

// Enhanced fetch mock for vitest tests
export function createFetchMock() {
  return async (_url: string | URL | Request, options?: RequestInit): Promise<Response> => {
    try {
      // Parse the GraphQL request to determine what to mock
      const body = options?.body ? JSON.parse(options.body as string) : {};
      const query = body.query || '';
      
      // Handle GraphQL introspection queries (used by GraphQL client internally)
      if (query.includes('__schema') || query.includes('IntrospectionQuery')) {
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
                  fields: [
                    { name: "defaultMailSenderName", type: { name: "String" } }
                  ]
                },
                {
                  kind: "OBJECT", 
                  name: "Channel",
                  fields: [
                    { name: "name", type: { name: "String" } },
                    { name: "slug", type: { name: "String" } }
                  ]
                }
              ]
            }
          }
        });
      }
      
      // Handle specific GraphQL operations based on query content
      if (query.includes('productTypeCreate') || query.includes('ProductTypeCreate')) {
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

      if (query.includes('pageTypeCreate') || query.includes('PageTypeCreate')) {
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

      if (query.includes('categoryCreate') || query.includes('CategoryCreate')) {
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
      if (options?.headers && 
          typeof options.headers === 'object' && 
          'authorization' in options.headers &&
          (options.headers as GraphQLFetchOptions['headers'] as Record<string, string>).authorization === 'Bearer invalid-token') {
        return createMockResponse({
          errors: [{ 
            message: "Authentication credentials were not provided.",
            extensions: { code: "UNAUTHENTICATED" }
          }]
        }, 401);
      }

      // Default introspection response for diff queries
      if (query.includes('shop') || query.includes('channels') || body.operationName === 'GetConfig') {
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
              defaultDigitalMaxDownloads: null,
              defaultDigitalUrlValidDays: null,
              defaultWeightUnit: "KG",
              allowLoginWithoutConfirmation: false
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
                  automaticallyCompleteFullyPaidCheckouts: true
                },
                paymentSettings: {
                  defaultTransactionFlowStrategy: "CHARGE"
                },
                stockSettings: {
                  allocationStrategy: "PRIORITIZE_SORTING_ORDER"
                },
                orderSettings: {
                  automaticallyConfirmAllNewOrders: true,
                  automaticallyFulfillNonShippableGiftCard: true,
                  expireOrdersAfter: "30",
                  deleteExpiredOrdersAfter: "60",
                  markAsPaidStrategy: "PAYMENT_FLOW",
                  allowUnpaidOrders: false,
                  includeDraftOrderInVoucherUsage: false
                }
              }
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
      return createMockResponse({
        errors: [{ message: `GraphQL Error: ${error}` }]
      }, 400);
    }
  };
}

// Global cleanup utility
export function cleanupAllMocks(): void {
  nock.cleanAll();
  if (nock.isActive()) {
    nock.restore();
  }
} 