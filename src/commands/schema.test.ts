import { writeFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { schemaHandler } from "./schema";

vi.mock("node:fs");

function createDefaultArgs(overrides?: Partial<Parameters<typeof schemaHandler>[0]>) {
  return {
    output: undefined,
    ...overrides,
  };
}

describe("schema command", () => {
  let mockConsoleLog: MockInstance;
  let mockConsoleError: MockInstance;

  beforeEach(() => {
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("without --output flag", () => {
    it("should print JSON to stdout", () => {
      schemaHandler(createDefaultArgs());

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      const output = mockConsoleLog.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it("should include $schema field in output", () => {
      schemaHandler(createDefaultArgs());

      const output = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("$schema");
      expect(parsed.$schema).toContain("json-schema.org");
    });

    it("should include title field in output", () => {
      schemaHandler(createDefaultArgs());

      const output = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("title");
      expect(typeof parsed.title).toBe("string");
    });

    it("should include description field in output", () => {
      schemaHandler(createDefaultArgs());

      const output = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("description");
      expect(typeof parsed.description).toBe("string");
    });

    it("should include properties.channels in output", () => {
      schemaHandler(createDefaultArgs());

      const output = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty("properties");
      expect(parsed.properties).toHaveProperty("channels");
    });

    it("should not call writeFileSync", () => {
      schemaHandler(createDefaultArgs());

      expect(writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("with --output flag", () => {
    it("should call writeFileSync with the provided path", () => {
      schemaHandler(createDefaultArgs({ output: "schema.json" }));

      expect(writeFileSync).toHaveBeenCalledWith(
        "schema.json",
        expect.any(String),
        expect.any(String)
      );
    });

    it("should write valid JSON to file", () => {
      schemaHandler(createDefaultArgs({ output: "schema.json" }));

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const content = writeCall[1] as string;
      expect(() => JSON.parse(content)).not.toThrow();
    });

    it("should write JSON that includes $schema field", () => {
      schemaHandler(createDefaultArgs({ output: "schema.json" }));

      const writeCall = vi.mocked(writeFileSync).mock.calls[0];
      const parsed = JSON.parse(writeCall[1] as string);
      expect(parsed).toHaveProperty("$schema");
    });

    it("should not call console.log for JSON output", () => {
      schemaHandler(createDefaultArgs({ output: "schema.json" }));

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it("should print success message to stderr", () => {
      schemaHandler(createDefaultArgs({ output: "schema.json" }));

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("schema.json"));
    });
  });
});
