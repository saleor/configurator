import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ["**/*.e2e.ts"],
    globalSetup: [path.join(import.meta.dirname, "global-setup.ts")],
    // Every file writes to the one store and introspects all of it; run them one at a time.
    fileParallelism: false,
    testTimeout: 5 * 60_000,
    hookTimeout: 10 * 60_000,
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
});
