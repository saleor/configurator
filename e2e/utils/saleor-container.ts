import { DockerComposeEnvironment, Wait, type StartedDockerComposeEnvironment } from "testcontainers";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SaleorContainerConfig {
  projectName?: string;
  composeFile?: string;
  superuserEmail?: string;
  superuserPassword?: string;
  startTimeout?: number;
}

export class SaleorTestContainer {
  private environment: StartedDockerComposeEnvironment | null = null;
  private apiUrl = "";
  private adminToken = "";
  private readonly config: Required<SaleorContainerConfig>;

  constructor(config: SaleorContainerConfig = {}) {
    this.config = {
      projectName: config.projectName || `saleor-e2e-${Date.now()}`,
      composeFile: config.composeFile || "docker-compose.test.yml",
      superuserEmail: config.superuserEmail || "admin@example.com",
      superuserPassword: config.superuserPassword || "admin123",
      startTimeout: config.startTimeout || 300000, // 5 minutes for CI environments
    };
  }

  async start(): Promise<void> {
    console.log("🚀 Starting Saleor test container...");
    
    const isCI = process.env.CI === "true";
    const composeFilePath = path.join(__dirname, "../docker");
    
    // Log environment for debugging
    console.log(`📊 Environment: CI=${isCI}, Node=${process.version}, Platform=${process.platform}`);
    
    try {
      // Clean up any existing containers with the same project name
      try {
        const { execa } = await import("execa");
        await execa("docker", ["compose",
          "-f", path.join(composeFilePath, this.config.composeFile),
          "-p", this.config.projectName,
          "down",
          "--volumes",
          "--remove-orphans"
        ]);
      } catch {
        // Ignore errors if no containers exist
      }
      
      // Start Docker Compose environment
      this.environment = await new DockerComposeEnvironment(
        composeFilePath,
        this.config.composeFile
      )
        .withProjectName(this.config.projectName)
        .withWaitStrategy("db", Wait.forHealthCheck())
        .withWaitStrategy("redis", Wait.forHealthCheck())
        .withWaitStrategy("api-init", Wait.forSuccessfulCommand("exit 0"))
        .withWaitStrategy("api", Wait.forHealthCheck())
        .withStartupTimeout(this.config.startTimeout)
        .up();

      console.log("✅ Docker Compose environment started");

      // Services should be ready after healthchecks pass
      console.log("✅ All services healthy, proceeding with container discovery...");

      // Get the API container using service name
      let apiContainer;
      try {
        // Try the service name first (most reliable)
        apiContainer = this.environment.getContainer("api");
        console.log(`📦 Found API container using service name`);
      } catch (error) {
        console.error("❌ Could not find API container:", error);
        // Log debugging info
        try {
          const containers = this.environment.getContainers();
          console.error("Available containers:", containers.map(c => c.getName()));
        } catch (debugError) {
          console.error("Could not list containers:", debugError);
        }
        throw new Error("API container not found - ensure docker-compose services are named correctly");
      }
      
      const apiPort = apiContainer.getMappedPort(8000);
      this.apiUrl = `http://localhost:${apiPort}/graphql/`;

      console.log(`📡 Saleor API available at: ${this.apiUrl}`);

      // Wait for API to be fully ready
      await this.waitForApi();

      // Create superuser and get auth token
      await this.setupAuthentication();

      console.log("✅ Saleor test container ready!");
    } catch (error) {
      console.error("❌ Failed to start Saleor test container:", error);
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.environment) {
      console.log("🛑 Stopping Saleor test container...");
      try {
        await this.environment.down({ removeVolumes: true });
        console.log("✅ Saleor test container stopped");
      } catch (error) {
        console.error("❌ Error stopping container:", error);
      }
      this.environment = null;
    }
  }

  getApiUrl(): string {
    if (!this.apiUrl) {
      throw new Error("Container not started. Call start() first.");
    }
    return this.apiUrl;
  }

  getAdminToken(): string {
    if (!this.adminToken) {
      throw new Error("Admin token not available. Container may not be fully initialized.");
    }
    return this.adminToken;
  }

  private async waitForApi(maxRetries = 30, delayMs = 2000): Promise<void> {
    console.log("⏳ Waiting for Saleor API to be ready...");
    console.log(`📊 Will attempt ${maxRetries} times with ${delayMs}ms delay (max ${Math.round((maxRetries * delayMs) / 1000)}s total)`);
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "{ shop { name } }",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data?.shop) {
            console.log("✅ Saleor API is ready");
            return;
          } else if (data.errors) {
            console.log(`⚠️ GraphQL errors on attempt ${i + 1}:`, data.errors);
          }
        }
        
        // Log progress every 10 attempts
        if ((i + 1) % 10 === 0) {
          console.log(`⏳ Still waiting... attempt ${i + 1}/${maxRetries}`);
        }
      } catch (error) {
        // API not ready yet, continue waiting
        if ((i + 1) % 20 === 0) {
          console.log(`⚠️ API still not responding (attempt ${i + 1}/${maxRetries}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw new Error(`Saleor API failed to become ready in time after ${maxRetries} attempts over ${Math.round((maxRetries * delayMs) / 1000)} seconds`);
  }

  private async setupAuthentication(): Promise<void> {
    console.log("🔐 Setting up authentication...");
    
    try {
      // First, try to create the superuser via Django management command
      await this.createSuperuser();
    } catch (error) {
      console.log("⚠️ Could not create superuser via management command, trying GraphQL...");
    }

    // Get auth token
    this.adminToken = await this.getAuthToken();
    console.log("✅ Authentication configured");
  }

  private async createSuperuser(): Promise<void> {
    if (!this.environment) {
      throw new Error("Environment not started");
    }

    const apiContainer = this.environment.getContainer("api");
    
    // Create superuser using Django management command
    const result = await apiContainer.exec([
      "python",
      "manage.py",
      "shell",
      "-c",
      `
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='${this.config.superuserEmail}').exists():
    User.objects.create_superuser(
        email='${this.config.superuserEmail}',
        password='${this.config.superuserPassword}'
    )
    print('Superuser created')
else:
    print('Superuser already exists')
      `.trim(),
    ]);

    if (result.exitCode !== 0) {
      throw new Error(`Failed to create superuser: ${result.output}`);
    }
  }

  private async getAuthToken(): Promise<string> {
    // Try to authenticate with the superuser credentials
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation TokenCreate($email: String!, $password: String!) {
            tokenCreate(email: $email, password: $password) {
              token
              errors {
                field
                message
              }
            }
          }
        `,
        variables: {
          email: this.config.superuserEmail,
          password: this.config.superuserPassword,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get auth token: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    if (data.data?.tokenCreate?.errors?.length > 0) {
      throw new Error(`Authentication errors: ${JSON.stringify(data.data.tokenCreate.errors)}`);
    }

    const token = data.data?.tokenCreate?.token;
    if (!token) {
      throw new Error("No token received from authentication");
    }

    return token;
  }

  // Helper method to execute GraphQL queries against the test instance
  async graphql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.adminToken && { Authorization: `Bearer ${this.adminToken}` }),
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  // Reset the database to a clean state (useful between test runs)
  async reset(): Promise<void> {
    if (!this.environment) {
      throw new Error("Container not started");
    }

    console.log("🔄 Resetting Saleor database...");
    
    const dbContainer = this.environment.getContainer("db");
    
    // Drop and recreate the database
    await dbContainer.exec([
      "psql",
      "-U",
      "saleor",
      "-c",
      "DROP DATABASE IF EXISTS saleor;",
    ]);
    
    await dbContainer.exec([
      "psql",
      "-U",
      "saleor",
      "-c",
      "CREATE DATABASE saleor;",
    ]);

    // Run migrations
    const apiContainer = this.environment.getContainer("api");
    await apiContainer.exec(["python", "manage.py", "migrate"]);

    // Re-setup authentication
    await this.setupAuthentication();
    
    console.log("✅ Database reset complete");
  }
}