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
  const isCI = process.env.CI === 'true';
  
  return {
    apiUrl: process.env.SALEOR_API_URL || 'http://localhost:8000/graphql/',
    adminEmail: 'admin@example.com',
    adminPassword: 'admin123',
    dbUrl: isCI 
      ? 'postgresql://postgres:postgres@localhost:5432/saleor'
      : 'postgresql://saleor:saleor@localhost:5432/saleor',
  };
}

/**
 * Get admin authentication token from Saleor API
 */
export async function getAdminToken(apiUrl: string, email: string = 'admin@example.com', password: string = 'admin123'): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error('No authentication token received');
  }

  return token;
}

/**
 * Wait for Saleor API to be ready
 */
export async function waitForApi(apiUrl: string, maxRetries: number = 30, delayMs: number = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ shop { name } }',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.shop) {
          console.log('✅ Saleor API is ready');
          return;
        }
      }
    } catch {
      // API not ready yet, continue waiting
    }

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Saleor API failed to become ready after ${maxRetries} attempts`);
}