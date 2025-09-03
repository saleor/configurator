import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SimpleContainer } from "../../utils/simple-container.js";
import { CliRunner } from "../../utils/cli-runner.js";

describe("Minimal Docker Test", () => {
  let container: SimpleContainer;
  let cli: CliRunner;
  let apiUrl: string;
  let token: string;

  beforeAll(async () => {
    // Use simplified container management
    container = new SimpleContainer({
      projectName: "saleor-minimal-test",
    });
    
    await container.start();
    
    apiUrl = container.getApiUrl();
    token = container.getAdminToken();
    cli = new CliRunner();
    
    console.log("✅ Test setup complete");
  }, 600000); // 10 minutes timeout for setup

  afterAll(async () => {
    await container?.stop();
  });

  it("should introspect from Saleor", async () => {
    const result = await cli.run([
      "introspect",
      "--url", apiUrl,
      "--token", token,
      "--config", "/tmp/test-config.yml"
    ]);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Introspection completed");
  });
});