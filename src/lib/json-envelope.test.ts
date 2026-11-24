import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { buildEnvelope, outputEnvelope } from "./json-envelope";

describe("buildEnvelope", () => {
  it("builds envelope with all required fields", () => {
    const envelope = buildEnvelope({
      command: "deploy",
      exitCode: 0,
      result: { status: "success" },
    });

    expect(envelope.command).toBe("deploy");
    expect(envelope.exitCode).toBe(0);
    expect(envelope.result).toEqual({ status: "success" });
    expect(envelope.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(envelope.logs).toEqual([]);
    expect(envelope.errors).toEqual([]);
  });

  it("includes provided errors", () => {
    const envelope = buildEnvelope({
      command: "deploy",
      exitCode: 5,
      result: {},
      errors: [{ entity: "Categories/electronics", stage: "update", message: "Not found" }],
    });

    expect(envelope.errors).toHaveLength(1);
    expect(envelope.errors[0].entity).toBe("Categories/electronics");
  });

  it("collects logs from global collector", () => {
    const envelope = buildEnvelope({
      command: "diff",
      exitCode: 0,
      result: {},
      logs: [{ level: "info", ts: "2026-03-05T09:30:00Z", message: "test" }],
    });

    expect(envelope.logs).toHaveLength(1);
  });
});

describe("JsonEnvelope type", () => {
  it("serializes to valid JSON", () => {
    const envelope = buildEnvelope({
      command: "validate",
      exitCode: 0,
      result: { valid: true, errors: [] },
    });

    const json = JSON.stringify(envelope, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.command).toBe("validate");
  });
});

describe("outputEnvelope", () => {
  const envelope = buildEnvelope({ command: "diff", exitCode: 0, result: { ok: true } });

  function withTempDir(run: (dir: string) => void) {
    const dir = mkdtempSync(join(tmpdir(), "configurator-envelope-"));
    try {
      run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("writes the envelope to the file without printing it", () => {
    withTempDir((dir) => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const file = join(dir, "result.json");

      outputEnvelope(envelope, { print: false, file });

      expect(JSON.parse(readFileSync(file, "utf-8"))).toEqual(envelope);
      expect(log).not.toHaveBeenCalled();
      log.mockRestore();
    });
  });

  it("prints and writes the same envelope when both are requested", () => {
    withTempDir((dir) => {
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const file = join(dir, "result.json");

      outputEnvelope(envelope, { print: true, file });

      expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual(
        JSON.parse(readFileSync(file, "utf-8"))
      );
      log.mockRestore();
    });
  });
});
