import { SaleorTestContainer } from "./saleor-container.js";

/**
 * Manages a shared Saleor container instance across multiple test files
 * to avoid the overhead of starting/stopping containers for each test suite.
 */
export class ContainerManager {
  private static instance: ContainerManager;
  private container: SaleorTestContainer | null = null;
  private isStarted = false;
  private startPromise: Promise<void> | null = null;
  private refCount = 0;

  private constructor() {}

  static getInstance(): ContainerManager {
    if (!ContainerManager.instance) {
      ContainerManager.instance = new ContainerManager();
    }
    return ContainerManager.instance;
  }

  /**
   * Get or create a shared container instance.
   * Multiple calls will reuse the same container.
   */
  async getContainer(): Promise<{
    apiUrl: string;
    token: string;
    container: SaleorTestContainer;
  }> {
    this.refCount++;
    
    // If already started, return existing container
    if (this.isStarted && this.container) {
      console.log(`♻️ Reusing existing container (ref count: ${this.refCount})`);
      return {
        apiUrl: this.container.getApiUrl(),
        token: this.container.getAdminToken(),
        container: this.container,
      };
    }

    // If currently starting, wait for it
    if (this.startPromise) {
      console.log("⏳ Waiting for container to start...");
      await this.startPromise;
      if (this.container) {
        return {
          apiUrl: this.container.getApiUrl(),
          token: this.container.getAdminToken(),
          container: this.container,
        };
      }
    }

    // Start new container
    console.log("🚀 Starting shared container for tests...");
    this.container = new SaleorTestContainer({
      projectName: `saleor-shared-${Date.now()}`,
    });

    this.startPromise = this.container.start().then(() => {
      this.isStarted = true;
      console.log("✅ Shared container ready!");
    });

    await this.startPromise;

    return {
      apiUrl: this.container.getApiUrl(),
      token: this.container.getAdminToken(),
      container: this.container,
    };
  }

  /**
   * Release reference to container. When ref count reaches 0,
   * the container will be stopped.
   */
  async release(): Promise<void> {
    this.refCount--;
    console.log(`📉 Released container reference (ref count: ${this.refCount})`);
    
    if (this.refCount <= 0 && this.container) {
      console.log("🛑 Stopping shared container (no more references)...");
      await this.container.stop();
      this.container = null;
      this.isStarted = false;
      this.startPromise = null;
      this.refCount = 0;
    }
  }

  /**
   * Force stop the container regardless of ref count.
   * Used for cleanup in global teardown.
   */
  async forceStop(): Promise<void> {
    if (this.container) {
      console.log("🛑 Force stopping shared container...");
      await this.container.stop();
      this.container = null;
      this.isStarted = false;
      this.startPromise = null;
      this.refCount = 0;
    }
  }

  /**
   * Check if container is currently running
   */
  isRunning(): boolean {
    return this.isStarted && this.container !== null;
  }

  /**
   * Get current reference count
   */
  getRefCount(): number {
    return this.refCount;
  }
}

// Export singleton instance
export const containerManager = ContainerManager.getInstance();