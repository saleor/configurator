/**
 * CLI Integration Tests
 *
 * Tests for the main CLI functionality including end-to-end argument parsing,
 * validation, error handling, and help display integration.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { parseCliArgs } from "./index";

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
    const argv = [
      "--url=https://api.example.com",
      "--token=valid-token",
      "--verbose",
    ];
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
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow(
      "Process exit called"
    );

    expect(consoleSpy).toHaveBeenCalledWith("❌ Invalid arguments provided:\n");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should exit with error for missing required arguments", () => {
    // Arrange
    const argv = ["--verbose"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow(
      "Process exit called"
    );

    expect(consoleSpy).toHaveBeenCalledWith("❌ Invalid arguments provided:\n");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle parsing errors gracefully", () => {
    // Arrange
    const argv = ["--duplicate=value1", "--duplicate=value2"];
    const env = {};

    // Act & Assert
    expect(() => parseCliArgs(testSchema, "test", { argv, env })).toThrow(
      "Process exit called"
    );

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
    expect(() =>
      parseCliArgs(simpleSchema, "test-command", { argv, env })
    ).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("\n📖 TEST-COMMAND Command Help\n");
    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should display help and exit when -h is provided", () => {
    // Arrange
    const argv = ["-h"];
    const env = {};

    // Act & Assert
    expect(() =>
      parseCliArgs(simpleSchema, "test-command", { argv, env })
    ).toThrow("Process exit called");

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });

  it("should display help even when other arguments are present", () => {
    // Arrange
    const argv = ["--url=https://example.com", "--help", "--token=secret"];
    const env = {};

    // Act & Assert
    expect(() =>
      parseCliArgs(simpleSchema, "test-command", { argv, env })
    ).toThrow("Process exit called");

    expect(processExitSpy).toHaveBeenCalledWith(0);
  });
});
