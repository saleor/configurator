import { describe, it, expect } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";
import { 
  createTempDir, 
  cleanupTempDir, 
  writeYaml 
} from "../../utils/test-helpers.js";
import path from "node:path";

describe("E2E User Error Experience", () => {
  it("should provide clear guidance when configuration file is missing", async () => {
    const cli = new CliRunner();
    
    const result = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
      config: "/non/existent/config.yml",
      timeout: 5000
    });
    
    expect(result).toHaveFailed();
    // User should understand what went wrong
    expect(result).toMatchPattern(/configuration file not found|does not exist/i);
    // User should get actionable advice
    expect(result).toContainHelpfulSuggestions();
  });

  it("should explain validation errors in business terms", async () => {
    const cli = new CliRunner();
    const testDir = await createTempDir("error-test-");
    
    try {
      const invalidConfigPath = path.join(testDir, "invalid.yml");
      const invalidConfig = {
        shop: {
          // Missing required fields
          description: "Invalid store config"
        },
        channels: "this-should-be-an-array" // Wrong type
      };
      
      await writeYaml(invalidConfigPath, invalidConfig);
      
      const result = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
        config: invalidConfigPath,
        timeout: 5000
      });
      
      expect(result).toHaveFailed();
      // User should understand what's wrong with their config
      expect(result).toMatchPattern(/validation|invalid|required|must be/i);
      // No technical jargon like "ZodError" or stack traces
      expect(result).toHaveUserFriendlyError();
    } finally {
      await cleanupTempDir(testDir);
    }
  });

  it("should provide helpful suggestions when commands are misused", async () => {
    const cli = new CliRunner();
    
    // Missing required arguments
    const result = await cli.run(["deploy"]);
    
    expect(result).toHaveFailed();
    // User should know what's missing
    expect(result).toMatchPattern(/required|missing|url|token/i);
    // Should suggest how to fix it
    expect(result).toContainHelpfulSuggestions();
  });

  it("should handle network errors with clear recovery steps", async () => {
    const cli = new CliRunner();
    const testDir = await createTempDir("network-test-");
    
    try {
      const configPath = path.join(testDir, "config.yml");
      await writeYaml(configPath, {
        shop: {
          defaultMailSenderName: "Test Store",
          defaultMailSenderAddress: "test@example.com"
        },
        channels: []
      });
      
      // Unreachable host
      const result = await cli.deploy("http://localhost:59999/graphql/", "test-token", {
        config: configPath,
        timeout: 3000
      });
      
      expect(result).toHaveFailed();
      // User should understand it's a connection issue
      expect(result).toMatchPattern(/network|connection|unable to reach|cannot connect/i);
      // Should provide recovery suggestions
      expect(result).toContainHelpfulSuggestions();
    } finally {
      await cleanupTempDir(testDir);
    }
  });
});