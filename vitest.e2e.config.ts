import { defineConfig } from "vitest/config";

const isCI = process.env.CI === "true";

export default defineConfig({
  test: {
    setupFiles: ["./src/lib/test-setup.ts"],
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 120_000, // 2 minutes - reduced from 10 minutes
    hookTimeout: 60_000, // 1 minute - reduced from 5 minutes
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1,
    retry: isCI ? 1 : 0,
    silent: false, // Allow console.log statements to show
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
