import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { validateHandler } from "./validate";

vi.mock("node:fs/promises");

function createDefaultArgs(overrides?: Partial<Parameters<typeof validateHandler>[0]>) {
  return {
    config: "config.yml",
    json: false,
    text: true, // Force human-readable in non-TTY test environment
    ...overrides,
  };
}

describe("validate command", () => {
  let mockExit: MockInstance<(code?: string | number | null) => never>;
  let mockConsoleLog: MockInstance;
  let mockConsoleError: MockInstance;

  beforeEach(() => {
    mockExit = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("--json-file", () => {
    it("writes the envelope to the file and keeps human-readable output on stdout", async () => {
      vi.mocked(readFile).mockResolvedValue("shop:\n  headerText: [unclosed\n" as never);
      const dir = mkdtempSync(join(tmpdir(), "configurator-validate-"));
      const jsonFile = join(dir, "result.json");

      try {
        await expect(validateHandler(createDefaultArgs({ jsonFile }))).rejects.toThrow(
          "process.exit(1)"
        );

        const envelope = JSON.parse(readFileSync(jsonFile, "utf-8"));
        expect(envelope).toMatchObject({ command: "validate", exitCode: 1 });
        expect(envelope.result.valid).toBe(false);
        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("not valid YAML"));
        expect(mockConsoleLog).not.toHaveBeenCalled();
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("valid configuration", () => {
    it("should exit 0 and print success message for valid config", async () => {
      vi.mocked(readFile).mockResolvedValue("shop:\n  headerText: My Shop\n" as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      expect(mockExit).toHaveBeenCalledWith(0);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining("valid"));
    });

    it("should output JSON envelope with valid:true when --json flag is set", async () => {
      vi.mocked(readFile).mockResolvedValue("shop:\n  headerText: My Shop\n" as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(0)"
      );

      expect(mockExit).toHaveBeenCalledWith(0);
      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.command).toBe("validate");
      expect(parsed.exitCode).toBe(0);
      expect(parsed.result).toEqual({ valid: true, errors: [], warnings: [] });
    });

    it("should accept empty config (all fields are optional)", async () => {
      vi.mocked(readFile).mockResolvedValue("{}\n" as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("unknown keys", () => {
    const configWithUnknownKey = "shop:\n  headerText: My Shop\n  headrText: Typo\n";

    it("should exit 0 and warn about the unknown key", async () => {
      const mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(readFile).mockResolvedValue(configWithUnknownKey as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '  Unknown key "shop.headrText" is not supported and was ignored'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith("Configuration is valid");
    });

    it("should list the unknown key under warnings in the JSON envelope", async () => {
      vi.mocked(readFile).mockResolvedValue(configWithUnknownKey as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(0)"
      );

      const parsed = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(parsed.result).toEqual({
        valid: true,
        errors: [],
        warnings: [
          {
            path: "shop.headrText",
            message: 'Unknown key "shop.headrText" is not supported and was ignored',
          },
        ],
      });
    });

    it("should still fail on invalid values", async () => {
      vi.mocked(readFile).mockResolvedValue(
        "shop:\n  headrText: Typo\n  trackInventoryByDefault: maybe\n" as never
      );

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(2)"
      );

      const parsed = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(parsed.result.valid).toBe(false);
      expect(parsed.result.errors).toEqual([
        expect.objectContaining({ path: "shop.trackInventoryByDefault" }),
      ]);
    });
  });

  describe("unparseable YAML", () => {
    const multiDocumentYaml = "shop:\n  headerText: A\n---\nshop:\n  headerText: B\n";

    it("should output a JSON envelope instead of crashing when --json flag is set", async () => {
      vi.mocked(readFile).mockResolvedValue(multiDocumentYaml as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(1)"
      );

      const parsed = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(parsed.command).toBe("validate");
      expect(parsed.exitCode).toBe(1);
      expect(parsed.result.valid).toBe(false);
      expect(parsed.result.errors[0].message).toContain("Invalid YAML");
    });

    it("should print a readable error in text mode", async () => {
      vi.mocked(readFile).mockResolvedValue(multiDocumentYaml as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(1)");

      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("not valid YAML"));
    });
  });

  describe("validation errors", () => {
    it("should exit 2 when config has schema violations", async () => {
      // channels must be an array, not a string
      vi.mocked(readFile).mockResolvedValue("channels: not-an-array\n" as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(2)");

      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("should print error details for invalid config", async () => {
      vi.mocked(readFile).mockResolvedValue("channels: not-an-array\n" as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(2)");

      // Should print something to stderr or stdout indicating the error
      const allOutput = [
        ...mockConsoleError.mock.calls.map((c) => c.join(" ")),
        ...mockConsoleLog.mock.calls.map((c) => c.join(" ")),
      ].join("\n");
      expect(allOutput.length).toBeGreaterThan(0);
    });

    it("should output JSON envelope with valid:false and errors when --json flag is set", async () => {
      vi.mocked(readFile).mockResolvedValue("channels: not-an-array\n" as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(2)"
      );

      expect(mockExit).toHaveBeenCalledWith(2);
      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.command).toBe("validate");
      expect(parsed.exitCode).toBe(2);
      expect(parsed.result.valid).toBe(false);
      expect(Array.isArray(parsed.result.errors)).toBe(true);
      expect(parsed.result.errors.length).toBeGreaterThan(0);
      expect(parsed.result.errors[0]).toHaveProperty("path");
      expect(parsed.result.errors[0]).toHaveProperty("message");
    });

    it("should include path and message in JSON error output", async () => {
      vi.mocked(readFile).mockResolvedValue("channels: not-an-array\n" as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(2)"
      );

      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      const error = parsed.result.errors[0];
      expect(typeof error.path).toBe("string");
      expect(typeof error.message).toBe("string");
    });
  });

  describe("file read errors", () => {
    it("should exit 2 when config file does not exist", async () => {
      const error = Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(error as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(2)");

      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("should print error message when file not found", async () => {
      const error = Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(error as never);

      await expect(validateHandler(createDefaultArgs())).rejects.toThrow("process.exit(2)");

      const allOutput = [
        ...mockConsoleError.mock.calls.map((c) => c.join(" ")),
        ...mockConsoleLog.mock.calls.map((c) => c.join(" ")),
      ].join("\n");
      expect(allOutput).toMatch(/config\.yml|file|not found/i);
    });

    it("should output JSON envelope when file not found and --json flag is set", async () => {
      const error = Object.assign(new Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
      });
      vi.mocked(readFile).mockRejectedValue(error as never);

      await expect(validateHandler(createDefaultArgs({ json: true, text: false }))).rejects.toThrow(
        "process.exit(2)"
      );

      const logCall = mockConsoleLog.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      expect(parsed.command).toBe("validate");
      expect(parsed.result.valid).toBe(false);
      expect(Array.isArray(parsed.result.errors)).toBe(true);
      expect(parsed.result.errors.length).toBeGreaterThan(0);
    });

    it("should use the config path specified in args", async () => {
      const error = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      vi.mocked(readFile).mockRejectedValue(error as never);

      await expect(
        validateHandler(createDefaultArgs({ config: "custom/path/config.yml" }))
      ).rejects.toThrow("process.exit(2)");

      expect(vi.mocked(readFile)).toHaveBeenCalledWith("custom/path/config.yml", "utf-8");
    });
  });
});
