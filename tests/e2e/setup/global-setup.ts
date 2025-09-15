import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface TestContext {
  testWorkspace: string;
  saleorUrl: string;
  saleorToken: string;
}

// Global test context
let globalTestContext: TestContext;

/**
 * Setup test environment for E2E tests
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  // Create temporary workspace for test files
  const testWorkspace = await mkdtemp(join(tmpdir(), "saleor-configurator-e2e-"));

  // Get Saleor sandbox configuration from environment
  const saleorUrl = process.env.E2E_SALEOR_URL || "https://sandbox-a.staging.saleor.cloud";
  const saleorToken = process.env.E2E_SALEOR_TOKEN || "F0NRNjskPnhBo27Vy9i6SJtFJeNNCU";

  // Validate required environment variables
  if (!saleorUrl || !saleorToken) {
    throw new Error(
      "Missing required environment variables for E2E tests. " +
      "Please set E2E_SALEOR_URL and E2E_SALEOR_TOKEN"
    );
  }

  const context: TestContext = {
    testWorkspace,
    saleorUrl,
    saleorToken,
  };

  console.log(`📁 Test workspace: ${testWorkspace}`);
  console.log(`🌐 Saleor URL: ${saleorUrl}`);

  return context;
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(context: TestContext): Promise<void> {
  // Clean up temporary workspace
  if (context.testWorkspace && existsSync(context.testWorkspace)) {
    await rm(context.testWorkspace, { recursive: true, force: true });
    console.log(`🧹 Cleaned up test workspace: ${context.testWorkspace}`);
  }
}

// Global setup and teardown
beforeAll(async () => {
  console.log("🚀 Setting up E2E test environment...");
  globalTestContext = await setupTestEnvironment();
}, 30000);

afterAll(async () => {
  console.log("🧹 Cleaning up E2E test environment...");
  if (globalTestContext) {
    await cleanupTestEnvironment(globalTestContext);
  }
}, 30000);

// Make context available to tests
beforeEach(() => {
  // Extend the test context with our global context
  return globalTestContext;
});

// Export context for use in tests
export function getTestContext(): TestContext {
  if (!globalTestContext) {
    throw new Error("Test context not initialized. Make sure global setup has run.");
  }
  return globalTestContext;
}

// Export for direct import
export { globalTestContext };