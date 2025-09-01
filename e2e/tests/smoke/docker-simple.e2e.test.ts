import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CliRunner } from "../../utils/cli-runner.js";
import { createTempDir, cleanupTempDir, writeYaml, readYaml } from "../../utils/test-helpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("E2E Docker Simple Test", () => {
  const projectName = `saleor-e2e-${Date.now()}`;
  const composeFile = path.join(__dirname, "../../docker/docker-compose.test.yml");
  let apiUrl: string;
  let apiPort: number;
  let adminToken: string;
  let testDir: string;

  beforeAll(async () => {
    console.log("🚀 Starting Docker Compose manually...");
    
    testDir = await createTempDir("docker-test-");
    
    // Start Docker Compose
    await execa("docker-compose", [
      "-f", composeFile,
      "-p", projectName,
      "up", "-d"
    ]);
    
    console.log("⏳ Waiting for containers to start...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds for startup
    
    // Get the API port
    const { stdout: portOutput } = await execa("docker", [
      "port",
      `${projectName}-api-1`,
      "8000"
    ]);
    
    apiPort = parseInt(portOutput.split(":")[1]);
    apiUrl = `http://localhost:${apiPort}/graphql/`;
    
    console.log(`📡 API URL: ${apiUrl}`);
    
    // Run migrations
    console.log("🔄 Running migrations...");
    await execa("docker", [
      "exec",
      `${projectName}-api-1`,
      "python", "manage.py", "migrate"
    ]);
    
    // Create superuser
    console.log("👤 Creating superuser...");
    await execa("docker", [
      "exec",
      `${projectName}-api-1`,
      "python", "manage.py", "shell", "-c",
      `
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser(email='admin@example.com', password='admin123')
    print('Superuser created')
      `.trim()
    ]);
    
    // Get auth token
    console.log("🔐 Getting auth token...");
    const tokenResponse = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation {
            tokenCreate(email: "admin@example.com", password: "admin123") {
              token
            }
          }
        `
      })
    });
    
    const tokenData = await tokenResponse.json();
    adminToken = tokenData.data?.tokenCreate?.token;
    
    if (!adminToken) {
      throw new Error("Failed to get admin token");
    }
    
    console.log("✅ Docker environment ready!");
  }, 120000); // 2 minutes timeout

  afterAll(async () => {
    console.log("🧹 Cleaning up Docker environment...");
    
    await cleanupTempDir(testDir);
    
    await execa("docker-compose", [
      "-f", composeFile,
      "-p", projectName,
      "down", "-v"
    ]);
  });

  it("should be able to query the GraphQL API", async () => {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        query: `
          query {
            shop {
              name
              domain {
                host
              }
            }
          }
        `
      })
    });
    
    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(data.data).toHaveProperty("shop");
    expect(data.data.shop).toHaveProperty("name");
  });

  it("should run introspect command successfully", async () => {
    const cli = new CliRunner();
    const configPath = path.join(testDir, "config.yml");
    
    const result = await cli.introspect(apiUrl, adminToken, {
      config: configPath,
      timeout: 30000
    });
    
    expect(result).toHaveSucceeded();
    expect(result).toContainInOutput("Introspection completed");
    
    // Verify config was created
    const config = await readYaml(configPath);
    expect(config).toHaveProperty("shop");
    expect(config).toHaveProperty("channels");
  });

  it("should run deploy command successfully", async () => {
    const cli = new CliRunner();
    const configPath = path.join(testDir, "deploy-config.yml");
    
    // Create a minimal config
    const config = {
      shop: {
        defaultMailSenderName: "Docker Test Store",
        defaultMailSenderAddress: "docker@test.com"
      },
      channels: []
    };
    
    await writeYaml(configPath, config);
    
    const result = await cli.deploy(apiUrl, adminToken, {
      config: configPath,
      skipDiff: true,
      timeout: 30000
    });
    
    expect(result).toHaveSucceeded();
    expect(result).toContainInOutput("Deployment completed");
  });
});