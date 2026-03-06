import { describe, expect, it } from "vitest";
import { JsonLogCollector } from "./json-log-collector";

describe("JsonLogCollector", () => {
  it("collects log entries", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "Starting deployment");
    collector.add("warn", "Rate limited");

    const logs = collector.getLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].level).toBe("info");
    expect(logs[0].message).toBe("Starting deployment");
    expect(logs[1].level).toBe("warn");
  });

  it("includes ISO timestamps", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "test");

    const logs = collector.getLogs();
    expect(logs[0].ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns immutable copy", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "first");

    const logs1 = collector.getLogs();
    collector.add("info", "second");
    const logs2 = collector.getLogs();

    expect(logs1).toHaveLength(1);
    expect(logs2).toHaveLength(2);
  });

  it("resets collected logs", () => {
    const collector = new JsonLogCollector();
    collector.add("info", "test");
    collector.reset();

    expect(collector.getLogs()).toHaveLength(0);
  });
});
