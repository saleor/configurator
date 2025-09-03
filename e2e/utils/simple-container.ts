import { execa } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SimpleContainerConfig {
  projectName?: string;
  timeout?: number;
}

/**
 * Simplified container management using docker-compose directly
 * instead of testcontainers which has reliability issues in CI
 */
export class SimpleContainer {
  private projectName: string;
  private apiUrl = "";
  private adminToken = "";
  private isRunning = false;
  private dockerPath: string;

  constructor(config: SimpleContainerConfig = {}) {
    this.projectName = config.projectName || `saleor-e2e-${Date.now()}`;
    this.dockerPath = path.join(__dirname, "../docker");
  }

  async start(): Promise<void> {
    console.log("🚀 Starting Saleor containers with docker-compose...");
    
    try {
      // Clean up any existing containers
      await this.cleanup();

      // Start containers
      console.log("📦 Starting containers...");
      await execa("docker", [
        "compose",
        "-f", path.join(this.dockerPath, "docker-compose.simple.yml"),
        "-p", this.projectName,
        "up",
        "-d",
        "--wait",
        "--wait-timeout", "300"
      ], {
        cwd: this.dockerPath,
        stdio: "inherit"
      });

      // Get the API port
      const { stdout: apiPort } = await execa("docker", [
        "compose",
        "-f", path.join(this.dockerPath, "docker-compose.simple.yml"),
        "-p", this.projectName,
        "port",
        "api",
        "8000"
      ], { cwd: this.dockerPath });

      // Parse the port from output like "0.0.0.0:32768"
      const port = apiPort.split(":")[1];
      this.apiUrl = `http://localhost:${port}/graphql/`;
      
      console.log(`📡 Saleor API will be at: ${this.apiUrl}`);
      
      // Wait for API to be ready
      await this.waitForApi();
      
      // Run migrations
      await this.runMigrations();
      
      // Create superuser
      await this.createSuperuser();
      
      // Get auth token
      this.adminToken = await this.getAuthToken();
      
      this.isRunning = true;
      console.log("✅ Saleor containers ready!");
      
    } catch (error) {
      console.error("❌ Failed to start containers:", error);
      await this.cleanup();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log("🛑 Stopping Saleor containers...");
    await this.cleanup();
    this.isRunning = false;
  }

  private async cleanup(): Promise<void> {
    try {
      await execa("docker", [
        "compose",
        "-f", path.join(this.dockerPath, "docker-compose.simple.yml"),
        "-p", this.projectName,
        "down",
        "--volumes",
        "--remove-orphans"
      ], {
        cwd: this.dockerPath,
        stdio: "inherit"
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  private async waitForApi(maxRetries = 60): Promise<void> {
    console.log("⏳ Waiting for Saleor API to be ready...");
    
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
          console.log("✅ Saleor API is responding");
          return;
        }
      } catch {
        // Not ready yet
      }

      if ((i + 1) % 10 === 0) {
        console.log(`⏳ Still waiting... attempt ${i + 1}/${maxRetries}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error("Saleor API failed to become ready");
  }

  private async runMigrations(): Promise<void> {
    console.log("📦 Running database migrations...");
    
    await execa("docker", [
      "compose",
      "-f", path.join(this.dockerPath, "docker-compose.simple.yml"),
      "-p", this.projectName,
      "exec",
      "-T",
      "api",
      "python",
      "manage.py",
      "migrate",
      "--no-input"
    ], {
      cwd: this.dockerPath,
      stdio: "inherit"
    });
    
    console.log("✅ Migrations complete");
  }

  private async createSuperuser(): Promise<void> {
    console.log("👤 Creating superuser...");
    
    const command = `
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@example.com').exists():
    User.objects.create_superuser(
        email='admin@example.com',
        password='admin123'
    )
    print('Superuser created')
else:
    print('Superuser already exists')
`;

    await execa("docker", [
      "compose",
      "-f", path.join(this.dockerPath, "docker-compose.simple.yml"),
      "-p", this.projectName,
      "exec",
      "-T",
      "api",
      "python",
      "manage.py",
      "shell"
    ], {
      cwd: this.dockerPath,
      input: command,
      stdio: ["pipe", "inherit", "inherit"]
    });
    
    console.log("✅ Superuser ready");
  }

  private async getAuthToken(): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation {
            tokenCreate(email: "admin@example.com", password: "admin123") {
              token
              errors {
                message
              }
            }
          }
        `,
      }),
    });

    const data = await response.json();
    
    if (data.data?.tokenCreate?.token) {
      return data.data.tokenCreate.token;
    }

    throw new Error("Failed to get auth token");
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getAdminToken(): string {
    return this.adminToken;
  }
}