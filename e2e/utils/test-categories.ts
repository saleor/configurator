/**
 * Test categories for organizing E2E tests based on Docker requirements
 * and isolation needs.
 */

export enum TestCategory {
  /**
   * Tests that don't require Docker at all
   * Examples: CLI help, version, validation
   */
  NO_DOCKER = "no-docker",

  /**
   * Tests that need Docker but can share a container
   * Examples: Read-only operations, introspect, diff
   */
  SHARED_DOCKER = "shared-docker",

  /**
   * Tests that need isolated Docker containers
   * Examples: Deployment tests, data modification
   */
  ISOLATED_DOCKER = "isolated-docker",
}

export interface TestConfig {
  category: TestCategory;
  skipInCI?: boolean;
  timeout?: number;
}

/**
 * Determine if a test should run based on environment and category
 */
export function shouldRunTest(config: TestConfig): boolean {
  const isCI = process.env.CI === "true";
  const skipDocker = process.env.SKIP_DOCKER_E2E === "true";
  
  // Skip CI-disabled tests
  if (isCI && config.skipInCI) {
    return false;
  }
  
  // Handle Docker requirements
  if (skipDocker) {
    return config.category === TestCategory.NO_DOCKER;
  }
  
  return true;
}

/**
 * Get test timeout based on category and environment
 */
export function getTestTimeout(category: TestCategory): number {
  const isCI = process.env.CI === "true";
  const multiplier = isCI ? 2 : 1; // Double timeouts in CI
  
  switch (category) {
    case TestCategory.NO_DOCKER:
      return 10000 * multiplier; // 10s (20s in CI)
    case TestCategory.SHARED_DOCKER:
      return 30000 * multiplier; // 30s (60s in CI)
    case TestCategory.ISOLATED_DOCKER:
      return 60000 * multiplier; // 60s (120s in CI)
    default:
      return 30000 * multiplier;
  }
}