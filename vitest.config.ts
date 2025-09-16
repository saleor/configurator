import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/lib/test-setup.ts"],
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["tests/e2e/**"],
  },
});
