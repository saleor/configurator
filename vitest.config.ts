import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./src/lib/test-setup.ts"],
  },
});
