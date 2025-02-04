import { beforeAll } from "vitest";

beforeAll(() => {
  // Set default test environment variables
  process.env.APP_TOKEN = process.env.APP_TOKEN || "test-token";
  process.env.SALEOR_API_URL =
    process.env.SALEOR_API_URL || "http://test.example.com";
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || "error";
});
