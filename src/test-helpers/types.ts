// Test helper types

// Mock nock types for testing
export interface MockNockScope {
  post(path: string): MockNockScope;
  reply(status: number, response: unknown): MockNockScope;
  replyWithError(error: unknown): MockNockScope;
  persist(value?: boolean): MockNockScope;
  done(): void;
  isDone(): boolean;
}

export interface MockNock {
  (baseUrl: string): MockNockScope;
  cleanAll(): void;
  isActive(): boolean;
  activate(): void;
  restore(): void;
}

// Shop configuration type for tests
export interface TestShopConfig {
  defaultMailSenderName?: string;
  defaultMailSenderAddress?: string;
  displayGrossPrices?: boolean;
  enableAccountConfirmationByEmail?: boolean;
  limitQuantityPerCheckout?: number | undefined;
  trackInventoryByDefault?: boolean;
  reserveStockDurationAnonymousUser?: number;
  reserveStockDurationAuthenticatedUser?: number;
  defaultDigitalMaxDownloads?: number | undefined;
  defaultDigitalUrlValidDays?: number | undefined;
  defaultWeightUnit?: string;
  allowLoginWithoutConfirmation?: boolean;
}

// Fetch options type for GraphQL mock
export interface GraphQLFetchOptions {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string;
}