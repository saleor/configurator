import { beforeAll, expect } from "vitest";
import { cliMatchers } from "./assertions.ts";

// Extend Vitest's expect with custom CLI matchers
expect.extend(cliMatchers);

// Set up any per-file test configuration
beforeAll(() => {
  // Ensure consistent timezone for tests
  process.env.TZ = "UTC";

  // Disable color output for cleaner assertions
  process.env.FORCE_COLOR = "0";
  process.env.NO_COLOR = "1";

  // Set test environment
  process.env.NODE_ENV = "test";
});
