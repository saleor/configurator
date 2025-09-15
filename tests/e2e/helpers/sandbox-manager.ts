import { execa } from "execa";

export interface SaleorConnection {
  url: string;
  token: string;
}

export interface SandboxState {
  productCount: number;
  categoryCount: number;
  attributeCount: number;
  timestamp: number;
}

/**
 * Manages interactions with Saleor sandbox for E2E testing
 */
export class SandboxManager {
  private readonly connection: SaleorConnection;

  constructor(connection: SaleorConnection) {
    this.connection = connection;
  }

  /**
   * Test connection to Saleor instance
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔗 Testing connection to ${this.connection.url}...`);

      // Simple GraphQL query to test connection
      const query = `
        query {
          shop {
            name
            domain
          }
        }
      `;

      const response = await this.executeGraphQLQuery(query);
      const isConnected = response && response.shop;

      if (isConnected) {
        console.log(`✅ Connected to ${response.shop.name} (${response.shop.domain})`);
      } else {
        console.log(`❌ Failed to connect to ${this.connection.url}`);
      }

      return isConnected;
    } catch (error) {
      console.log(`❌ Connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Get current state of the sandbox
   */
  async getSandboxState(): Promise<SandboxState> {
    try {
      const query = `
        query {
          products(first: 0) {
            totalCount
          }
          categories(first: 0) {
            totalCount
          }
          attributes(first: 0) {
            totalCount
          }
        }
      `;

      const response = await this.executeGraphQLQuery(query);

      return {
        productCount: response.products?.totalCount || 0,
        categoryCount: response.categories?.totalCount || 0,
        attributeCount: response.attributes?.totalCount || 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.log(`❌ Failed to get sandbox state: ${error}`);
      throw error;
    }
  }

  /**
   * Wait for sandbox to be ready (basic health check)
   */
  async waitForSandboxReady(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const isReady = await this.testConnection();
        if (isReady) {
          console.log(`✅ Sandbox is ready`);
          return;
        }
      } catch (error) {
        // Continue waiting
      }

      console.log(`⏳ Waiting for sandbox to be ready...`);
      await this.sleep(2000);
    }

    throw new Error(`Sandbox not ready within ${timeoutMs}ms`);
  }

  /**
   * Execute a GraphQL query against the Saleor instance
   */
  private async executeGraphQLQuery(query: string, variables?: any): Promise<any> {
    try {
      const body = JSON.stringify({
        query: query.trim(),
        variables: variables || {},
      });

      // Use curl via execa for GraphQL requests
      const response = await execa("curl", [
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", `Authorization: Bearer ${this.connection.token}`,
        "-d", body,
        `${this.connection.url}/graphql/`,
      ]);

      if (response.exitCode !== 0) {
        throw new Error(`HTTP request failed: ${response.stderr}`);
      }

      const data = JSON.parse(response.stdout);

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      return data.data;
    } catch (error) {
      throw new Error(`GraphQL query failed: ${error}`);
    }
  }

  /**
   * Create a test product via GraphQL
   */
  async createTestProduct(name: string, slug: string): Promise<string> {
    const mutation = `
      mutation CreateProduct($input: ProductCreateInput!) {
        productCreate(input: $input) {
          product {
            id
            name
            slug
          }
          errors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        name,
        slug,
        productType: "default-product-type", // Assuming a default product type exists
      },
    };

    try {
      const response = await this.executeGraphQLQuery(mutation, variables);

      if (response.productCreate.errors.length > 0) {
        throw new Error(`Product creation failed: ${JSON.stringify(response.productCreate.errors)}`);
      }

      const productId = response.productCreate.product.id;
      console.log(`✅ Created test product: ${name} (${productId})`);
      return productId;
    } catch (error) {
      console.log(`❌ Failed to create test product: ${error}`);
      throw error;
    }
  }

  /**
   * Create a test category via GraphQL
   */
  async createTestCategory(name: string, slug: string): Promise<string> {
    const mutation = `
      mutation CreateCategory($input: CategoryCreateInput!) {
        categoryCreate(input: $input) {
          category {
            id
            name
            slug
          }
          errors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        name,
        slug,
      },
    };

    try {
      const response = await this.executeGraphQLQuery(mutation, variables);

      if (response.categoryCreate.errors.length > 0) {
        throw new Error(`Category creation failed: ${JSON.stringify(response.categoryCreate.errors)}`);
      }

      const categoryId = response.categoryCreate.category.id;
      console.log(`✅ Created test category: ${name} (${categoryId})`);
      return categoryId;
    } catch (error) {
      console.log(`❌ Failed to create test category: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up test data (use with caution in sandbox)
   */
  async cleanupTestData(testIds: string[]): Promise<void> {
    console.log(`🧹 Cleaning up test data: ${testIds.length} items`);

    // Note: In a real implementation, you might want to delete specific test entities
    // For now, we'll just log the cleanup operation
    // This is safer for a shared sandbox environment

    for (const id of testIds) {
      console.log(`🗑️  Would clean up: ${id}`);
    }

    console.log(`✅ Test data cleanup completed`);
  }

  /**
   * Backup current sandbox state (metadata only)
   */
  async backupSandboxState(): Promise<SandboxState> {
    console.log(`💾 Backing up sandbox state...`);
    const state = await this.getSandboxState();
    console.log(`✅ Sandbox state backed up: ${JSON.stringify(state)}`);
    return state;
  }

  /**
   * Compare current state with previous state
   */
  async compareStates(before: SandboxState, after: SandboxState): Promise<{
    productsDelta: number;
    categoriesDelta: number;
    attributesDelta: number;
  }> {
    return {
      productsDelta: after.productCount - before.productCount,
      categoriesDelta: after.categoryCount - before.categoryCount,
      attributesDelta: after.attributeCount - before.attributeCount,
    };
  }

  /**
   * Validate sandbox is in expected state
   */
  async validateSandboxState(expectedState: Partial<SandboxState>): Promise<boolean> {
    const currentState = await this.getSandboxState();

    for (const [key, expectedValue] of Object.entries(expectedState)) {
      const currentValue = currentState[key as keyof SandboxState];
      if (currentValue !== expectedValue) {
        console.log(`❌ State validation failed: ${key} expected ${expectedValue}, got ${currentValue}`);
        return false;
      }
    }

    console.log(`✅ Sandbox state validation passed`);
    return true;
  }

  /**
   * Sleep utility
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a sandbox manager from test context
   */
  static fromTestContext(testContext: { saleorUrl: string; saleorToken: string }): SandboxManager {
    return new SandboxManager({
      url: testContext.saleorUrl,
      token: testContext.saleorToken,
    });
  }
}