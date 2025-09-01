import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SaleorTestContainer } from "../../utils/saleor-container.js";

describe("E2E Container Basic Test", () => {
  let container: SaleorTestContainer;

  beforeAll(async () => {
    console.log("🚀 Starting container test...");
    
    container = new SaleorTestContainer({
      projectName: "saleor-basic-test",
      startTimeout: 180000, // 3 minutes
    });
    
    await container.start();
    console.log("✅ Container started successfully");
  }, 240000); // 4 minutes timeout

  afterAll(async () => {
    console.log("🧹 Cleaning up container...");
    await container?.stop();
  });

  it("should have a valid API URL", () => {
    const apiUrl = container.getApiUrl();
    expect(apiUrl).toMatch(/^http:\/\/localhost:\d+\/graphql\/$/);
  });

  it("should have a valid admin token", () => {
    const token = container.getAdminToken();
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
  });

  it("should be able to query the GraphQL API", async () => {
    const query = `
      query {
        shop {
          name
          domain {
            host
          }
        }
      }
    `;

    const data = await container.graphql(query);
    expect(data).toHaveProperty("shop");
    expect(data.shop).toHaveProperty("name");
  });
});