import { describe, it, expect } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";

describe("E2E Basic CLI Test", () => {
  it("should show version", async () => {
    const cli = new CliRunner();
    const result = await cli.version();
    
    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.cleanStdout).toContain("0.11.0");
  });

  it("should show help", async () => {
    const cli = new CliRunner();
    const result = await cli.help();
    
    // Help command exits with code 1 by default in Commander.js
    // but still outputs help text to stdout
    expect(result.exitCode).toBe(1);
    expect(result.cleanStdout).toContain("Saleor Configurator");
    expect(result.cleanStdout).toContain("deploy");
    expect(result.cleanStdout).toContain("introspect");
    expect(result.cleanStdout).toContain("diff");
  });
});