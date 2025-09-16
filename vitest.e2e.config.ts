import { defineConfig } from "vitest/config";

const isCI = process.env.CI === "true";

export default defineConfig({
  test: {
    setupFiles: ["./src/lib/test-setup.ts"],
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 300_000,
    maxConcurrency: 1,
    minWorkers: 1,
    maxWorkers: 1,
    retry: isCI ? 1 : 0,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
});
