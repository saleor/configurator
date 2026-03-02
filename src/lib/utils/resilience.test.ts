import { describe, expect, it, vi } from "vitest";
import { delay } from "./resilience";

describe("delay", () => {
  it("resolves after specified milliseconds", async () => {
    vi.useFakeTimers();

    const promise = delay(100);
    vi.advanceTimersByTime(100);
    await promise;

    vi.useRealTimers();
  });

  it("resolves with undefined", async () => {
    vi.useFakeTimers();

    const promise = delay(0);
    vi.advanceTimersByTime(0);
    const result = await promise;
    expect(result).toBeUndefined();

    vi.useRealTimers();
  });
});
