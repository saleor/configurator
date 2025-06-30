/**
 * CLI Integration Tests
 *
 * Tests for the main CLI functionality including end-to-end argument parsing,
 * validation, error handling, and help display integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { parseCliArgs, createCommandParser, setupCommand } from "./index";

describe("parseCliArgs integration", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  const testSchema = z.object({
    url: z.string().url().describe("API endpoint URL"),
    token: z.string().min(1).describe("Authentication token"),
    config: z.string().default("config.yml").describe("Configuration file"),
    verbose: z.boolean().default(false).describe("Enable verbose output"),
  });

  it("should parse and validate correct arguments successfully", () => {
    // Arrange
    const argv = ["--url=https://api.example.com", "--token=valid-token", "--verbose"];
    const env = {};

    // Act
    const result = parseCliArgs(testSchema, "test", { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://api.example.com",
      token: "valid-token",
      config: "config.yml",
      verbose: true,
    });
  });

  it("should merge environment variables with CLI arguments (CLI takes precedence)", () => {
    // Arrange
    const argv = ["--token=cli-token"];
    const env = {
      SALEOR_API_URL: "https://env.example.com",
      SALEOR_AUTH_TOKEN: "env-token",
      SALEOR_CONFIG_PATH: "env-config.yml",
    };

    // Act
    const result = parseCliArgs(testSchema, "test", { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://env.example.com",
      token: "cli-token", // CLI argument takes precedence
      config: "env-config.yml",
      verbose: false,
    });
  });

  it("should apply default values for missing optional arguments", () => {
    // Arrange
    const argv = ["--url=https://api.example.com", "--token=valid-token"];
    const env = {};

    // Act
    const result = parseCliArgs(testSchema, "test", { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://api.example.com",
      token: "valid-token",
      config: "config.yml", // Default value applied
      verbose: false, // Default value applied
    });
  });

  it("should exit with validation errors when arguments are invalid", () => {
    // Arrange
    const argv = ["--url=not-a-valid-url", "--token="];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Invalid arguments provided:\n");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should exit with error for missing required arguments", () => {
    // Arrange
    const argv = ["--verbose"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Invalid arguments provided:\n");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle parsing errors gracefully", () => {
    // Arrange
    const argv = ["--duplicate=value1", "--duplicate=value2"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

describe("parseCliArgs help handling", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  const simpleSchema = z.object({
    url: z.string().describe("API URL"),
    token: z.string().describe("Auth token"),
  });

  it("should display help and exit when --help is provided", () => {
    // Arrange
    const argv = ["--help"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(simpleSchema, "test-command", { argv, env })).toThrow(
      "Process exit called"
    );

    expect(consoleSpy).toHaveBeenCalledWith("\n📖 TEST-COMMAND Command Help\n");
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should display help and exit when -h is provided", () => {
    // Arrange
    const argv = ["-h"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(simpleSchema, "test-command", { argv, env })).toThrow(
      "Process exit called"
    );

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should display help even when other arguments are present", () => {
    // Arrange
    const argv = ["--url=https://example.com", "--help", "--token=secret"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(simpleSchema, "test-command", { argv, env })).toThrow(
      "Process exit called"
    );

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});

describe("createCommandParser", () => {
  const testSchema = z.object({
    url: z.string().describe("API URL"),
    debug: z.boolean().default(false).describe("Debug mode"),
  });

  it("should create a parser function that can be called multiple times", () => {
    // Arrange
    const parser = createCommandParser("test-cmd", testSchema);
    const options1 = { argv: ["--url=https://first.com"], env: {} };
    const options2 = { argv: ["--url=https://second.com", "--debug"], env: {} };

    // Act
    const result1 = parser(options1);
    const result2 = parser(options2);

    // Assert
    expect(result1).toEqual({
      url: "https://first.com",
      debug: false,
    });
    expect(result2).toEqual({
      url: "https://second.com",
      debug: true,
    });
  });

  it("should use process.argv and process.env when no options provided", () => {
    // Arrange
    const originalArgv = process.argv;
    const originalEnv = process.env;

    process.argv = ["node", "script.js", "--url=https://process.com"];
    process.env = { SALEOR_API_URL: "https://env.com" };

    const parser = createCommandParser("test-cmd", testSchema);

    try {
      // Act
      const result = parser();

      // Assert
      expect(result.url).toBe("https://process.com"); // CLI args take precedence
    } finally {
      // Cleanup
      process.argv = originalArgv;
      process.env = originalEnv;
    }
  });
});

describe("setupCommand", () => {
  it("should create command with common args only", () => {
    // Arrange
    const argv = [
      "--url=https://api.example.com",
      "--token=test-token",
      "--config=custom.yml",
      "--verbose",
    ];
    const env = {};

    // Act
    const result = setupCommand("setup-test", {}, { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://api.example.com",
      token: "test-token",
      config: "custom.yml",
      quiet: false,
      verbose: true,
      force: false,
      dryRun: false,
      skipValidation: false,
    });
  });

  it("should extend common args with custom arguments", () => {
    // Arrange
    const extensions = {
      format: z.enum(["json", "table"]).default("table").describe("Output format"),
      limit: z.string().optional().describe("Result limit"),
    };
    const argv = [
      "--url=https://api.example.com",
      "--token=test-token",
      "--format=json",
      "--limit=50",
    ];
    const env = {};

    // Act
    const result = setupCommand("extended-test", extensions, { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://api.example.com",
      token: "test-token",
      config: "config.yml",
      quiet: false,
      verbose: false,
      force: false,
      dryRun: false,
      skipValidation: false,
      format: "json",
      limit: "50",
    });
  });

  it("should handle environment variables in setup command", () => {
    // Arrange
    const argv = ["--verbose"];
    const env = {
      SALEOR_API_URL: "https://env.example.com",
      SALEOR_AUTH_TOKEN: "env-token",
    };

    // Act
    const result = setupCommand("env-test", {}, { argv, env });

    // Assert
    expect(result).toEqual({
      url: "https://env.example.com",
      token: "env-token",
      config: "config.yml",
      quiet: false,
      verbose: true,
      force: false,
      dryRun: false,
      skipValidation: false,
    });
  });
});
