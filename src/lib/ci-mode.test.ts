import { afterEach, describe, expect, it, vi } from "vitest";
import { isNonInteractiveEnvironment } from "./ci-mode";

describe("isNonInteractiveEnvironment", () => {
  const originalIsTTY = process.stdin.isTTY;

  afterEach(() => {
    // Restore original isTTY value
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
    vi.unstubAllEnvs();
  });

  it("returns true when stdin is not a TTY (piped input)", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("CI", undefined);

    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when stdin.isTTY is false", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("CI", undefined);

    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when CI env var is set, even if stdin is a TTY", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("CI", "true");

    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns false when stdin is a TTY and CI env var is not set", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("CI", undefined);

    expect(isNonInteractiveEnvironment()).toBe(false);
  });

  it("returns true when CI env var is '1'", () => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });
    vi.stubEnv("CI", "1");

    expect(isNonInteractiveEnvironment()).toBe(true);
  });
});
