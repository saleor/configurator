import { describe, it, expect } from "vitest";
import {
  extractEnvironmentDefaults,
  environmentToCliArgs,
  getEnvironmentHelpText,
} from "./environment";
import type { EnvironmentVariables } from "../schemas/types";

describe("extractEnvironmentDefaults", () => {
  it("should extract environment variables with defaults", () => {
    const mockEnv = {
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
      SALEOR_AUTH_TOKEN: "test-token-123",
      SALEOR_CONFIG_PATH: "custom-config.yml",
    };

    const result = extractEnvironmentDefaults(mockEnv);

    expect(result).toEqual({
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
      SALEOR_AUTH_TOKEN: "test-token-123",
      SALEOR_CONFIG_PATH: "custom-config.yml",
    });
  });

  it("should handle undefined environment variables", () => {
    const mockEnv = {
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
    };

    const result = extractEnvironmentDefaults(mockEnv);

    expect(result).toEqual({
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
      SALEOR_AUTH_TOKEN: undefined,
      SALEOR_CONFIG_PATH: undefined,
    });
  });

  it("should use process.env when no env parameter provided", () => {
    // Mock process.env
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      SALEOR_API_URL: undefined,
      SALEOR_AUTH_TOKEN: undefined,
      SALEOR_CONFIG_PATH: undefined,
    };

    const result = extractEnvironmentDefaults();

    expect(result).toEqual({
      SALEOR_API_URL: undefined,
      SALEOR_AUTH_TOKEN: undefined,
      SALEOR_CONFIG_PATH: undefined,
    });

    // Restore original process.env
    process.env = originalEnv;
  });

  it("should use custom configuration", () => {
    const mockEnv = {
      CUSTOM_URL: "https://custom.api.com",
      CUSTOM_TOKEN: "custom-token",
      CUSTOM_CONFIG: "custom.yml",
    };

    const customConfig = {
      prefix: "CUSTOM_",
      mappings: {
        url: "CUSTOM_URL",
        token: "CUSTOM_TOKEN",
        config: "CUSTOM_CONFIG",
      },
    };

    const result = extractEnvironmentDefaults(mockEnv, customConfig);

    expect(result).toEqual({
      SALEOR_API_URL: "https://custom.api.com",
      SALEOR_AUTH_TOKEN: "custom-token",
      SALEOR_CONFIG_PATH: "custom.yml",
    });
  });

  it("should prioritize explicit env over process.env", () => {
    process.env.SALEOR_API_URL = "https://process-env.com";
    process.env.SALEOR_AUTH_TOKEN = "process-token";

    const explicitEnv = {};

    const result = extractEnvironmentDefaults(explicitEnv);

    expect(result.SALEOR_API_URL).toBe(undefined);
    expect(result.SALEOR_AUTH_TOKEN).toBe(undefined);
  });
});

describe("environmentToCliArgs", () => {
  it("should convert environment variables to CLI arguments", () => {
    const envVars: EnvironmentVariables = {
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
      SALEOR_AUTH_TOKEN: "test-token-123",
      SALEOR_CONFIG_PATH: "production.yml",
    };

    const result = environmentToCliArgs(envVars);

    expect(result).toEqual({
      url: "https://api.saleor.io/graphql/",
      token: "test-token-123",
      config: "production.yml",
    });
  });

  it("should handle undefined values", () => {
    const envVars: EnvironmentVariables = {
      SALEOR_API_URL: "https://api.saleor.io/graphql/",
      SALEOR_AUTH_TOKEN: undefined,
      SALEOR_CONFIG_PATH: undefined,
    };

    const result = environmentToCliArgs(envVars);

    expect(result).toEqual({
      url: "https://api.saleor.io/graphql/",
      token: undefined,
      config: undefined,
    });
  });

  it("should handle empty environment variables object", () => {
    const envVars: EnvironmentVariables = {
      SALEOR_API_URL: undefined,
      SALEOR_AUTH_TOKEN: undefined,
      SALEOR_CONFIG_PATH: undefined,
    };

    const result = environmentToCliArgs(envVars);

    expect(result).toEqual({
      url: undefined,
      token: undefined,
      config: undefined,
    });
  });
});

describe("getEnvironmentHelpText", () => {
  it("should generate help text with default configuration", () => {
    const helpText = getEnvironmentHelpText();

    expect(helpText).toContain("🌍 Environment Variables:");
    expect(helpText).toContain("SALEOR_API_URL - Sets the --url argument");
    expect(helpText).toContain("SALEOR_AUTH_TOKEN - Sets the --token argument");
    expect(helpText).toContain(
      "SALEOR_CONFIG_PATH - Sets the --config argument"
    );
    expect(helpText).toContain(
      "export SALEOR_API_URL=https://demo.saleor.io/graphql/"
    );
    expect(helpText).toContain(
      "export SALEOR_AUTH_TOKEN=your-authentication-token"
    );
  });

  it("should generate help text with custom configuration", () => {
    const customConfig = {
      prefix: "CUSTOM_",
      mappings: {
        url: "CUSTOM_URL",
        token: "CUSTOM_TOKEN",
        config: "CUSTOM_CONFIG",
      },
    };

    const helpText = getEnvironmentHelpText(customConfig);

    expect(helpText).toContain("🌍 Environment Variables:");
    expect(helpText).toContain("CUSTOM_URL - Sets the --url argument");
    expect(helpText).toContain("CUSTOM_TOKEN - Sets the --token argument");
    expect(helpText).toContain("CUSTOM_CONFIG - Sets the --config argument");
  });

  it("should generate help text with minimal configuration", () => {
    const minimalConfig = {
      prefix: "TEST_",
      mappings: {
        url: "TEST_URL",
      },
    };

    const helpText = getEnvironmentHelpText(minimalConfig);

    expect(helpText).toContain("🌍 Environment Variables:");
    expect(helpText).toContain("TEST_URL - Sets the --url argument");
    expect(helpText).toContain("export SALEOR_API_URL=");
    expect(helpText).toContain("export SALEOR_AUTH_TOKEN=");
  });
});
