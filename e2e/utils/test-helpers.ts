import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import yaml from "yaml";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a temporary directory for test files
export async function createTempDir(prefix = "saleor-e2e-"): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return tempDir;
}

// Clean up a temporary directory
export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to cleanup temp dir ${dirPath}:`, error);
  }
}

// Read a YAML file
export async function readYaml<T = any>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, "utf-8");
  return yaml.parse(content) as T;
}

// Write a YAML file
export async function writeYaml(filePath: string, data: unknown): Promise<void> {
  const content = yaml.stringify(data);
  await fs.writeFile(filePath, content, "utf-8");
}

// Copy a fixture file to a destination
export async function copyFixture(fixtureName: string, destPath: string): Promise<void> {
  const fixturePath = path.join(__dirname, "../fixtures", fixtureName);
  await fs.copyFile(fixturePath, destPath);
}

// Load a fixture configuration
export async function loadFixture<T = any>(fixturePath: string): Promise<T> {
  const fullPath = path.join(__dirname, "../fixtures", fixturePath);
  return readYaml<T>(fullPath);
}

// Check if a file exists
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Read file content
export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

// Write file content
export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf-8");
}

// Create a directory recursively
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

// Wait for a condition to be true
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
  } = {}
): Promise<void> {
  const { timeout = 30000, interval = 1000, message = "Condition not met" } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition: ${message}`);
}

// Sleep for a specified duration
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Extract specific sections from YAML config
export function extractConfigSection(config: any, section: string): any {
  return config[section];
}

// Compare two configurations and return differences
export function compareConfigs(
  config1: any,
  config2: any,
  path = ""
): { path: string; value1: any; value2: any }[] {
  const differences: { path: string; value1: any; value2: any }[] = [];

  // Handle null/undefined cases
  if (config1 === config2) return differences;
  if (config1 == null || config2 == null) {
    differences.push({ path, value1: config1, value2: config2 });
    return differences;
  }

  // Handle arrays
  if (Array.isArray(config1) && Array.isArray(config2)) {
    const maxLength = Math.max(config1.length, config2.length);
    for (let i = 0; i < maxLength; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= config1.length) {
        differences.push({ path: itemPath, value1: undefined, value2: config2[i] });
      } else if (i >= config2.length) {
        differences.push({ path: itemPath, value1: config1[i], value2: undefined });
      } else {
        differences.push(...compareConfigs(config1[i], config2[i], itemPath));
      }
    }
    return differences;
  }

  // Handle objects
  if (typeof config1 === "object" && typeof config2 === "object") {
    const keys = new Set([...Object.keys(config1), ...Object.keys(config2)]);
    for (const key of keys) {
      const keyPath = path ? `${path}.${key}` : key;
      if (!(key in config1)) {
        differences.push({ path: keyPath, value1: undefined, value2: config2[key] });
      } else if (!(key in config2)) {
        differences.push({ path: keyPath, value1: config1[key], value2: undefined });
      } else {
        differences.push(...compareConfigs(config1[key], config2[key], keyPath));
      }
    }
    return differences;
  }

  // Primitive values
  if (config1 !== config2) {
    differences.push({ path, value1: config1, value2: config2 });
  }

  return differences;
}

// Parse CLI output for specific patterns
export function parseCliOutput(output: string): {
  success: boolean;
  message?: string;
  errors?: string[];
  warnings?: string[];
} {
  const lines = output.split("\n");
  const errors: string[] = [];
  const warnings: string[] = [];
  let success = false;
  let message = "";

  for (const line of lines) {
    const cleanLine = line.trim();
    
    if (cleanLine.includes("✅") || cleanLine.toLowerCase().includes("success")) {
      success = true;
      message = cleanLine;
    } else if (cleanLine.includes("❌") || cleanLine.toLowerCase().includes("error")) {
      errors.push(cleanLine);
    } else if (cleanLine.includes("⚠️") || cleanLine.toLowerCase().includes("warning")) {
      warnings.push(cleanLine);
    }
  }

  return { success, message, errors, warnings };
}

// Create a minimal test configuration
export function createMinimalConfig(): any {
  return {
    shop: {
      defaultMailSenderName: "Test Store",
      defaultMailSenderAddress: "test@example.com",
      customerAllowedToSetExternalReference: false,
    },
    channels: [
      {
        name: "Test Channel",
        slug: "test-channel",
        currencyCode: "USD",
        defaultCountry: "US",
      },
    ],
  };
}

// Create a complex test configuration
export function createComplexConfig(): any {
  return {
    shop: {
      defaultMailSenderName: "Complex Test Store",
      defaultMailSenderAddress: "complex@example.com",
      customerAllowedToSetExternalReference: true,
      displayGrossPrices: true,
      trackInventoryByDefault: true,
      defaultWeightUnit: "KG",
    },
    channels: [
      {
        name: "US Channel",
        slug: "us-channel",
        currencyCode: "USD",
        defaultCountry: "US",
      },
      {
        name: "EU Channel",
        slug: "eu-channel",
        currencyCode: "EUR",
        defaultCountry: "DE",
      },
    ],
    productTypes: [
      {
        name: "Book",
        slug: "book",
        isShippingRequired: true,
        productAttributes: [
          {
            name: "Author",
            slug: "author",
            inputType: "PLAIN_TEXT",
          },
          {
            name: "ISBN",
            slug: "isbn",
            inputType: "PLAIN_TEXT",
          },
        ],
      },
    ],
    categories: [
      {
        name: "Books",
        slug: "books",
        description: "All books",
        children: [
          {
            name: "Fiction",
            slug: "fiction",
            description: "Fiction books",
          },
          {
            name: "Non-Fiction",
            slug: "non-fiction",
            description: "Non-fiction books",
          },
        ],
      },
    ],
  };
}

// Retry a function with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        break;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await sleep(delay);
      
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError || new Error("All retry attempts failed");
}