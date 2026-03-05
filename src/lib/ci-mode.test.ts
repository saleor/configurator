import { afterEach, describe, expect, it } from "vitest";
import { isNonInteractiveEnvironment } from "./ci-mode";

describe("isNonInteractiveEnvironment", () => {
  const originalStdoutIsTTY = process.stdout.isTTY;
  const originalStdinIsTTY = process.stdin.isTTY;

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {
      value: originalStdoutIsTTY,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalStdinIsTTY,
      writable: true,
      configurable: true,
    });
  });

  function setTTY(stdout: boolean | undefined, stdin: boolean | undefined) {
    Object.defineProperty(process.stdout, "isTTY", {
      value: stdout,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(process.stdin, "isTTY", {
      value: stdin,
      writable: true,
      configurable: true,
    });
  }

  it("returns false when both stdout and stdin are TTY (real terminal)", () => {
    setTTY(true, true);
    expect(isNonInteractiveEnvironment()).toBe(false);
  });

  it("returns true when both are undefined (Claude Code, pipes)", () => {
    setTTY(undefined, undefined);
    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when stdout is not a TTY (piped output)", () => {
    setTTY(false, true);
    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when stdin is not a TTY (piped input)", () => {
    setTTY(true, false);
    expect(isNonInteractiveEnvironment()).toBe(true);
  });

  it("returns true when both are false (CI / full redirect)", () => {
    setTTY(false, false);
    expect(isNonInteractiveEnvironment()).toBe(true);
  });
});
