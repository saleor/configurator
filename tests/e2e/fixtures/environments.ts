/**
 * Environment configurations for E2E testing
 */

export interface TestEnvironment {
  name: string;
  saleorUrl: string;
  saleorToken: string;
  description: string;
  timeout: number;
  retries: number;
}

/**
 * Available test environments
 */
export const TEST_ENVIRONMENTS: Record<string, TestEnvironment> = {
  sandbox_a: {
    name: "Sandbox A",
    saleorUrl: "https://sandbox-a.staging.saleor.cloud",
    saleorToken: "F0NRNjskPnhBo27Vy9i6SJtFJeNNCU",
    description: "Primary sandbox environment for E2E testing",
    timeout: 60000,
    retries: 2,
  },

  sandbox_b: {
    name: "Sandbox B",
    saleorUrl: "https://sandbox-b.staging.saleor.cloud",
    saleorToken: "F0NRNjskPnhBo27Vy9i6SJtFJeNNCU",
    description: "Secondary sandbox environment for fallback testing",
    timeout: 60000,
    retries: 2,
  },

  local: {
    name: "Local Development",
    saleorUrl: "http://localhost:8000",
    saleorToken: "test-token",
    description: "Local development environment",
    timeout: 30000,
    retries: 1,
  },
};

/**
 * Get test environment configuration
 */
export function getTestEnvironment(): TestEnvironment {
  const envName = process.env.E2E_ENVIRONMENT || "sandbox_a";

  const environment = TEST_ENVIRONMENTS[envName];
  if (!environment) {
    throw new Error(
      `Unknown test environment: ${envName}. ` +
      `Available environments: ${Object.keys(TEST_ENVIRONMENTS).join(", ")}`
    );
  }

  // Override with environment variables if provided
  return {
    ...environment,
    saleorUrl: process.env.E2E_SALEOR_URL || environment.saleorUrl,
    saleorToken: process.env.E2E_SALEOR_TOKEN || environment.saleorToken,
  };
}

/**
 * Environment-specific test configuration
 */
export interface TestConfig {
  environment: TestEnvironment;
  testData: {
    productPrefix: string;
    categoryPrefix: string;
    testRunId: string;
  };
  cleanup: {
    enabled: boolean;
    retainOnFailure: boolean;
  };
}

/**
 * Generate test configuration for current run
 */
export function generateTestConfig(): TestConfig {
  const environment = getTestEnvironment();
  const testRunId = `e2e-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return {
    environment,
    testData: {
      productPrefix: `e2e-product-${testRunId}`,
      categoryPrefix: `e2e-category-${testRunId}`,
      testRunId,
    },
    cleanup: {
      enabled: process.env.E2E_CLEANUP !== "false",
      retainOnFailure: process.env.E2E_RETAIN_ON_FAILURE === "true",
    },
  };
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(environment: TestEnvironment): void {
  if (!environment.saleorUrl) {
    throw new Error("Saleor URL is required");
  }

  if (!environment.saleorToken) {
    throw new Error("Saleor token is required");
  }

  // Basic URL validation
  try {
    new URL(environment.saleorUrl);
  } catch (error) {
    throw new Error(`Invalid Saleor URL: ${environment.saleorUrl}`);
  }

  console.log(`✅ Environment validation passed for: ${environment.name}`);
}