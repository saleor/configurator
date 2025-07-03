import { beforeAll } from "vitest";

beforeAll(() => {
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || "error";
});
