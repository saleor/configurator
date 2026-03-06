import { describe, expect, it } from "vitest";
import { buildEnvelope } from "./json-envelope";

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
