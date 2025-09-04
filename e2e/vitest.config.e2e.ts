import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCI = process.env.CI === "true";

export default defineConfig({
  test: {
    name: "e2e",
    root: __dirname,
    testTimeout: isCI ? 120000 : 60000, // 2 minutes in CI, 1 minute locally
    hookTimeout: isCI ? 360000 : 180000, // 6 minutes in CI, 3 minutes locally
    globalSetup: [path.join(__dirname, "setup.ts")],
    globals: false,
    reporters: process.env.CI ? ["default", "json", "junit"] : ["default"],
    outputFile: {
      json: "./test-results/e2e-results.json",
      junit: "./test-results/e2e-results.xml",
    },
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Run tests sequentially to avoid port conflicts
      },
    },
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "error",
    },
    coverage: {
      enabled: false, // E2E tests don't need coverage
    },
    setupFiles: [path.join(__dirname, "utils/test-setup.ts")],
    include: ["tests/**/*.{test,spec,e2e}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
      "@e2e": path.resolve(__dirname),
    },
  },
});
