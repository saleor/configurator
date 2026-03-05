import { afterEach, describe, expect, it } from "vitest";
import { isNonInteractiveEnvironment } from "./ci-mode";

describe("isNonInteractiveEnvironment", () => {
  const originalIsTTY = process.stdout.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  it("returns true when stdout is not a TTY (piped output)", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when stdout.isTTY is false", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      writable: true,
      configurable: true,
    });

    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns false when stdout is a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      writable: true,
      configurable: true,
    });

    expect(isNonInteractiveEnvironment()).toBe(false);
  });
});
