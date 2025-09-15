import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    exclude: ["src/**/*", "tests/unit/**/*"],
    setupFiles: ["./tests/e2e/setup/global-setup.ts"],
    globalSetup: ["./tests/e2e/setup/global-setup.ts"],
    testTimeout: 60000, // 60 seconds for E2E tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    retry: 2, // Retry failed tests twice
    maxWorkers: 1, // Run E2E tests sequentially to avoid conflicts
    sequence: {
      concurrent: false, // Ensure tests run sequentially
    },
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "error",
    },
  },
});