import { describe, it, expect } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";
import { 
  createTempDir, 
  cleanupTempDir, 
  writeYaml 
} from "../../utils/test-helpers.js";
import path from "node:path";

describe("E2E Error Messages (No Docker)", () => {
  it("should provide user-friendly error messages for common issues", async () => {
    const cli = new CliRunner();
    const testDir = await createTempDir("error-messages-test-");
    
    try {
      // Test missing configuration file
      console.log("📄 Testing missing file error message...");
      const missingFileResult = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
        config: "/path/that/does/not/exist/config.yml",
        timeout: 5000
      });
      
      expect(missingFileResult).toHaveFailed();
      expect(missingFileResult).toMatchPattern(/configuration file not found|does not exist|failed to load/i);
      expect(missingFileResult).toHaveUserFriendlyError();
      expect(missingFileResult).toHaveConsistentErrorFormat();
      
      // Test invalid configuration file
      console.log("📋 Testing invalid configuration error message...");
      const invalidConfigPath = path.join(testDir, "invalid.yml");
      const invalidConfig = {
        shop: {
          // Missing required fields
          description: "Invalid store config"
        },
        channels: "this-should-be-an-array"
      };
      
      await writeYaml(invalidConfigPath, invalidConfig);
      
      const invalidConfigResult = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
        config: invalidConfigPath,
        timeout: 5000
      });
      
      expect(invalidConfigResult).toHaveFailed();
      expect(invalidConfigResult).toMatchPattern(/validation|invalid|required|must be/i);
      expect(invalidConfigResult).toHaveUserFriendlyError();
      expect(invalidConfigResult).toHaveConsistentErrorFormat();
      
      // Test missing required command arguments
      console.log("⚙️ Testing missing arguments error message...");
      const missingArgsResult = await cli.run(["deploy"]);
      
      expect(missingArgsResult).toHaveFailed();
      expect(missingArgsResult).toMatchPattern(/required|missing|url|token|argument/i);
      expect(missingArgsResult).toHaveUserFriendlyError();
      expect(missingArgsResult).toHaveConsistentErrorFormat();
      
      // Test invalid URL format
      console.log("🌐 Testing invalid URL error message...");
      const validConfigPath = path.join(testDir, "valid.yml");
      const validConfig = {
        shop: {
          defaultMailSenderName: "Test Store",
          defaultMailSenderAddress: "test@example.com"
        },
        channels: []
      };
      
      await writeYaml(validConfigPath, validConfig);
      
      const invalidUrlResult = await cli.deploy("not-a-valid-url", "test-token", {
        config: validConfigPath,
        timeout: 5000
      });
      
      expect(invalidUrlResult).toHaveFailed();
      expect(invalidUrlResult).toMatchPattern(/url|invalid|format|protocol/i);
      expect(invalidUrlResult).toHaveUserFriendlyError();
      expect(invalidUrlResult).toHaveConsistentErrorFormat();
      
      // Test network connection error (unreachable host)
      console.log("🔌 Testing network connection error message...");
      const networkErrorResult = await cli.deploy("http://localhost:59999/graphql/", "test-token", {
        config: validConfigPath,
        timeout: 3000
      });
      
      expect(networkErrorResult).toHaveFailed();
      expect(networkErrorResult).toMatchPattern(/network|not found|connection|unable to reach|failed to fetch/i);
      expect(networkErrorResult).toHaveUserFriendlyError();
      expect(networkErrorResult).toHaveConsistentErrorFormat();
      
      // Test timeout error (very short timeout)
      console.log("⏰ Testing timeout error message...");
      const timeoutResult = await cli.deploy("http://httpbin.org/delay/10", "test-token", {
        config: validConfigPath,
        timeout: 100 // Very short timeout
      });
      
      expect(timeoutResult).toHaveFailed();
      expect(timeoutResult).toMatchPattern(/timeout|time.*out|timed.*out|slow/i);
      expect(timeoutResult).toHaveUserFriendlyError();
      expect(timeoutResult).toHaveConsistentErrorFormat();
      
    } finally {
      await cleanupTempDir(testDir);
    }
  });

  it("should provide helpful command suggestions", async () => {
    const cli = new CliRunner();
    
    console.log("💡 Testing command help and suggestions...");
    
    // Test help command provides useful information
    const helpResult = await cli.help();
    
    // Help command returns exit code 1 in Commander.js but still provides output
    expect(helpResult.cleanStdout).toContain("Saleor Configurator");
    expect(helpResult.cleanStdout).toContain("deploy");
    expect(helpResult.cleanStdout).toContain("introspect");
    expect(helpResult.cleanStdout).toContain("diff");
    expect(helpResult).toContainHelpfulSuggestions();
    
    // Test version command
    const versionResult = await cli.version();
    
    expect(versionResult).toHaveSucceeded();
    expect(versionResult).toContainInOutput("0.11.0");
    expect(versionResult).toHaveConsistentErrorFormat();
    
    // Test invalid command suggests available commands
    const invalidCommandResult = await cli.run(["invalid-command"]);
    
    expect(invalidCommandResult).toHaveFailed();
    expect(invalidCommandResult).toMatchPattern(/unknown.*command|invalid.*command|help/i);
    expect(invalidCommandResult).toHaveUserFriendlyError();
  });

  it("should handle edge cases gracefully", async () => {
    const cli = new CliRunner();
    const testDir = await createTempDir("edge-cases-test-");
    
    try {
      // Test empty configuration file
      console.log("📝 Testing empty configuration file...");
      const emptyConfigPath = path.join(testDir, "empty.yml");
      await writeYaml(emptyConfigPath, {});
      
      const emptyConfigResult = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
        config: emptyConfigPath,
        timeout: 5000
      });
      
      expect(emptyConfigResult).toHaveFailed();
      expect(emptyConfigResult).toMatchPattern(/validation|required|missing|shop|channels/i);
      expect(emptyConfigResult).toHaveUserFriendlyError();
      
      // Test malformed YAML file
      console.log("📄 Testing malformed YAML file...");
      const malformedConfigPath = path.join(testDir, "malformed.yml");
      const fs = await import("node:fs/promises");
      await fs.writeFile(malformedConfigPath, `
shop:
  defaultMailSenderName: "Test Store"
  defaultMailSenderAddress: "test@example.com"
    invalid_indentation: true
channels: []
`, "utf8");
      
      const malformedResult = await cli.deploy("http://localhost:8000/graphql/", "test-token", {
        config: malformedConfigPath,
        timeout: 5000
      });
      
      expect(malformedResult).toHaveFailed();
      expect(malformedResult).toMatchPattern(/yaml|parse|invalid|format|syntax/i);
      expect(malformedResult).toHaveUserFriendlyError();
      
      // Test extremely long command (should not crash)
      console.log("🔧 Testing extremely long arguments...");
      const longUrl = "http://localhost:8000/graphql/" + "x".repeat(1000);
      const longResult = await cli.deploy(longUrl, "test-token", {
        config: emptyConfigPath,
        timeout: 2000
      });
      
      expect(longResult).toHaveFailed();
      // Should handle gracefully without crashing
      expect(longResult.exitCode).toBeGreaterThan(0);
      expect(longResult.exitCode).toBeLessThan(128);
      
    } finally {
      await cleanupTempDir(testDir);
    }
  });

  it("should maintain error message consistency across commands", async () => {
    const cli = new CliRunner();
    
    console.log("🔄 Testing error consistency across commands...");
    
    // Test same error (missing file) across different commands
    const nonExistentConfig = "/path/that/does/not/exist/config.yml";
    
    const deployResult = await cli.deploy("http://localhost:8000/graphql/", "token", {
      config: nonExistentConfig,
      timeout: 3000
    });
    
    const introspectResult = await cli.introspect("http://localhost:8000/graphql/", "token", {
      config: nonExistentConfig,
      timeout: 3000
    });
    
    const diffResult = await cli.diff("http://localhost:8000/graphql/", "token", {
      config: nonExistentConfig,
      timeout: 3000
    });
    
    // All commands should fail
    expect(deployResult).toHaveFailed();
    expect(introspectResult).toHaveFailed();
    expect(diffResult).toHaveFailed();
    
    // All should have user-friendly errors
    expect(deployResult).toHaveUserFriendlyError();
    expect(introspectResult).toHaveUserFriendlyError();
    expect(diffResult).toHaveUserFriendlyError();
    
    // All should mention the missing file
    expect(deployResult).toMatchPattern(/configuration file not found|does not exist|failed to load/i);
    expect(introspectResult).toMatchPattern(/create new configuration|will create/i); // introspect creates new file
    expect(diffResult).toMatchPattern(/configuration file not found|does not exist|failed to load/i);
    
    // All should have consistent formatting
    expect(deployResult).toHaveConsistentErrorFormat();
    expect(introspectResult).toHaveConsistentErrorFormat();
    expect(diffResult).toHaveConsistentErrorFormat();
    
    // Exit codes should be consistent (non-zero)
    expect(deployResult.exitCode).toBeGreaterThan(0);
    expect(introspectResult.exitCode).toBeGreaterThan(0);
    expect(diffResult.exitCode).toBeGreaterThan(0);
  });
});