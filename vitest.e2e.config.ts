import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 180_000,
    hookTimeout: 60_000,
    setupFiles: ["./src/lib/test-setup.ts"],
    reporters: ["default"],
  },
});
