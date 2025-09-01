import { beforeAll, afterAll } from "vitest";

// Global setup that runs once before all test files
export async function setup() {
  console.log("🚀 Starting E2E test suite setup...");
  
  // Set up any global test state
  process.env.E2E_TEST_RUN = "true";
  process.env.NODE_ENV = "test";
  
  // Ensure Docker is available
  try {
    const { execa } = await import("execa");
    await execa("docker", ["version"]);
    console.log("✅ Docker is available");
  } catch (error) {
    console.error("❌ Docker is not available. Please install Docker to run E2E tests.");
    throw new Error("Docker is required for E2E tests");
  }

  // Pull required Docker images to speed up first test
  console.log("📦 Pulling required Docker images...");
  try {
    const { execa } = await import("execa");
    await Promise.all([
      execa("docker", ["pull", "ghcr.io/saleor/saleor:3.20"]),
      execa("docker", ["pull", "postgres:15-alpine"]),
      execa("docker", ["pull", "redis:7.0-alpine"]),
    ]);
    console.log("✅ Docker images ready");
  } catch (error) {
    console.warn("⚠️ Could not pre-pull Docker images, tests may be slower on first run");
  }

  console.log("✅ E2E test suite setup complete");
}

// Global teardown that runs once after all test files
export async function teardown() {
  console.log("🧹 Cleaning up E2E test suite...");
  
  // Clean up any Docker containers that might be left running
  try {
    const { execa } = await import("execa");
    
    // Stop any containers with our test label
    const { stdout } = await execa("docker", [
      "ps",
      "-q",
      "--filter",
      "label=saleor-e2e-test",
    ]);
    
    if (stdout) {
      const containerIds = stdout.split("\n").filter(Boolean);
      for (const id of containerIds) {
        await execa("docker", ["stop", id]);
        await execa("docker", ["rm", id]);
      }
      console.log(`✅ Cleaned up ${containerIds.length} test container(s)`);
    }
  } catch (error) {
    console.warn("⚠️ Could not clean up Docker containers:", error);
  }

  console.log("✅ E2E test suite teardown complete");
}