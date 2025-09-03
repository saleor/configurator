import { describe, it, expect } from "vitest";
import { CliRunner } from "../../utils/cli-runner.js";
import { 
  createTempDir, 
  cleanupTempDir, 
  writeYaml, 
  readYaml,
  createMinimalConfig 
} from "../../utils/test-helpers.js";
import path from "node:path";

describe("E2E Simple Tests (No Docker)", () => {
  it("should show version correctly", async () => {
    const cli = new CliRunner();
    const result = await cli.version();
    
    expect(result).toHaveSucceeded();
    expect(result).toContainInOutput("0.11.0");
  });

  it("should show help for commands", async () => {
    const cli = new CliRunner();
    
    // Test help for deploy command
    const deployHelp = await cli.help("deploy");
    expect(deployHelp.cleanStdout).toContain("deploy");
    expect(deployHelp.cleanStdout).toContain("--url");
    expect(deployHelp.cleanStdout).toContain("--token");
    
    // Test help for introspect command
    const introspectHelp = await cli.help("introspect");
    expect(introspectHelp.cleanStdout).toContain("introspect");
    expect(introspectHelp.cleanStdout).toContain("--url");
    expect(introspectHelp.cleanStdout).toContain("--token");
  });

  it("should validate configuration file", async () => {
    const testDir = await createTempDir("validation-test-");
    const configPath = path.join(testDir, "test-config.yml");
    
    try {
      // Create a minimal valid configuration
      const config = createMinimalConfig();
      await writeYaml(configPath, config);
      
      // Try to run diff with invalid URL/token
      const cli = new CliRunner();
      const result = await cli.diff("https://invalid-saleor-instance.example.com/graphql/", "fake-token", {
        config: configPath,
        timeout: 5000
      });
      
      // Should fail due to network or auth error
      expect(result).toHaveFailed();
      // The error message will vary depending on whether DNS resolution or connection fails
      const errorPatterns = /connect|network|ECONNREFUSED|ENOTFOUND|getaddrinfo|Invalid URL|authentication|unauthorized/i;
      expect(result).toMatchPattern(errorPatterns);
      
      // Now test with invalid config
      const invalidConfig = {
        shop: {
          // Missing required fields
          invalidField: "test"
        },
        channels: "should-be-array" // Wrong type
      };
      
      const invalidConfigPath = path.join(testDir, "invalid-config.yml");
      await writeYaml(invalidConfigPath, invalidConfig);
      
      const invalidResult = await cli.diff("http://localhost:99999/graphql/", "fake-token", {
        config: invalidConfigPath,
        timeout: 5000
      });
      
      // Should fail due to validation error
      expect(invalidResult).toHaveFailed();
      expect(invalidResult).toMatchPattern(/validation|invalid|must be array/i);
    } finally {
      await cleanupTempDir(testDir);
    }
  });

  it("should handle missing required arguments", async () => {
    const cli = new CliRunner();
    
    // Try to run introspect without required args
    const result = await cli.run(["introspect"]);
    
    expect(result).toHaveFailed();
    expect(result).toMatchPattern(/required|missing|url|token/i);
  });

  it("should create and read YAML configurations", async () => {
    const testDir = await createTempDir("yaml-test-");
    
    try {
      const configPath = path.join(testDir, "config.yml");
      const config = createMinimalConfig();
      
      // Write config
      await writeYaml(configPath, config);
      
      // Read it back
      const readConfig = await readYaml(configPath);
      
      expect(readConfig).toEqual(config);
      expect(readConfig.shop.defaultMailSenderName).toBe("Test Store");
      expect(readConfig.channels).toHaveLength(1);
      expect(readConfig.channels[0].slug).toBe("test-channel");
    } finally {
      await cleanupTempDir(testDir);
    }
  });
});