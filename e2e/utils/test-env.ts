/**
 * Simple environment configuration for E2E tests
 * Works with both CI (GitHub Actions service containers) and local development
 */

export interface TestConfig {
  apiUrl: string;
  adminEmail: string;
  adminPassword: string;
  dbUrl: string;
}

/**
 * Get test configuration based on environment
 */
export function getTestConfig(): TestConfig {
  const isCI = process.env.CI === "true";

  return {
    apiUrl: process.env.SALEOR_API_URL || "http://localhost:8000/graphql/",
    adminEmail: "admin@example.com",
    adminPassword: "admin123",
    dbUrl: isCI
      ? "postgresql://postgres:postgres@localhost:5432/saleor"
      : "postgresql://saleor:saleor@localhost:5432/saleor",
  };
}

/**
 * Get admin authentication token from Saleor API
 */
export async function getAdminToken(
  apiUrl: string,
  email: string = "admin@example.com",
  password: string = "admin123"
): Promise<string> {
  const response = await fetch(apiUrl, {
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
      variables: { email, password },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to authenticate: ${response.statusText}`);
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
    throw new Error("No authentication token received");
  }

  return token;
}

/**
 * Wait for Saleor API to be ready
 * Enhanced with progressive backoff, better logging and longer timeout for CI environments
 */
export async function waitForApi(
  apiUrl: string,
  maxRetries: number = 150, // 5 minutes with progressive backoff
  baseDelayMs: number = 1000
): Promise<void> {
  const startTime = Date.now();
  console.log(`🔍 Waiting for Saleor API at ${apiUrl} (max ${maxRetries} attempts with progressive backoff)`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "{ shop { name } }",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.shop) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`✅ Saleor API is ready (took ${elapsed}s, attempt ${i + 1}/${maxRetries})`);
          return;
        } else {
          console.log(`⏳ GraphQL response incomplete (attempt ${i + 1}/${maxRetries}):`, JSON.stringify(data).slice(0, 200));
        }
      } else {
        console.log(`⏳ HTTP ${response.status} ${response.statusText} (attempt ${i + 1}/${maxRetries})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⏳ Connection failed (attempt ${i + 1}/${maxRetries}): ${errorMessage}`);
    }

    if (i < maxRetries - 1) {
      // Progressive backoff: start with 1s, increase to max 5s after attempt 10
      const delayMs = Math.min(baseDelayMs * (1 + Math.floor(i / 10)), 5000);
      
      // Log progress every 30 attempts or when delay changes
      if ((i + 1) % 30 === 0 || (i > 0 && i % 10 === 0)) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`🔄 Still waiting for API... ${elapsed}s elapsed, ${maxRetries - i - 1} attempts remaining (next delay: ${delayMs}ms)`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  throw new Error(
    `Saleor API failed to become ready after ${maxRetries} attempts (${totalTime}s). ` +
    `Check that Saleor service is running and accessible at ${apiUrl}`
  );
}
