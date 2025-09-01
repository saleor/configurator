import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    name: "e2e",
    root: __dirname,
    testTimeout: 60000, // 1 minute per test
    hookTimeout: 180000, // 3 minutes for hooks (container startup)
    globalSetup: [path.join(__dirname, "setup.ts")],
    globals: false,
    reporters: process.env.CI 
      ? ["default", "json", "junit"]
      : ["default"],
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