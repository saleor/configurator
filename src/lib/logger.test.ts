import { afterEach, describe, expect, it, vi } from "vitest";

const originalArgv = process.argv;
const originalStdoutTTY = process.stdout.isTTY;
const originalStdinTTY = process.stdin.isTTY;

afterEach(() => {
  process.argv = originalArgv;
  process.stdout.isTTY = originalStdoutTTY;
  process.stdin.isTTY = originalStdinTTY;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("logger output", () => {
  it.each([
    { flags: [], tty: false },
    { flags: ["--json"], tty: false },
    { flags: ["--json"], tty: true },
    { flags: ["--github-comment"], tty: true },
    { flags: ["--githubComment"], tty: true },
  ])("keeps stdout clean and collects logs for $flags (TTY: $tty)", async ({ flags, tty }) => {
    vi.resetModules();
    vi.stubEnv("LOG_LEVEL", "info");
    process.argv = ["node", "cli", "deploy", ...flags];
    process.stdout.isTTY = tty;
    process.stdin.isTTY = tty;
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("./logger");
    const { globalLogCollector } = await import("./json-log-collector");
    globalLogCollector.reset();
    logger.info("deployment starting");
    logger.fatal("deployment failed");
    expect(stdout).not.toHaveBeenCalled();
    expect(globalLogCollector.getLogs()).toEqual([
      expect.objectContaining({ level: "info", message: "deployment starting" }),
      expect.objectContaining({ level: "error", message: "deployment failed" }),
    ]);
  });

  it.each([
    { flags: ["--text"], tty: false },
    { flags: ["--json", "--text"], tty: false },
    { flags: [], tty: true },
  ])("preserves human logging for $flags (TTY: $tty)", async ({ flags, tty }) => {
    vi.resetModules();
    vi.stubEnv("LOG_LEVEL", "info");
    process.argv = ["node", "cli", "deploy", ...flags];
    process.stdout.isTTY = tty;
    process.stdin.isTTY = tty;
    const stdout = vi.spyOn(console, "log").mockImplementation(() => {});
    const { logger } = await import("./logger");
    logger.info("human output");
    expect(stdout).toHaveBeenCalled();
  });
});
