import { join } from "node:path";
import { mkdir, readdir, stat, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { faker } from "@faker-js/faker";
import * as tmp from "tmp";

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent?: string;
}

/**
 * Test data generator using faker.js
 */
export class TestDataGenerator {
  /**
   * Generate a test product
   */
  static generateProduct(overrides: Partial<TestProduct> = {}): TestProduct {
    const name = faker.commerce.productName();
    return {
      id: faker.string.uuid(),
      name,
      slug: faker.helpers.slugify(name).toLowerCase(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      ...overrides,
    };
  }

  /**
   * Generate a test category
   */
  static generateCategory(overrides: Partial<TestCategory> = {}): TestCategory {
    const name = faker.commerce.department();
    return {
      id: faker.string.uuid(),
      name,
      slug: faker.helpers.slugify(name).toLowerCase(),
      description: faker.lorem.sentence(),
      ...overrides,
    };
  }

  /**
   * Generate multiple test products
   */
  static generateProducts(count: number): TestProduct[] {
    return Array.from({ length: count }, () => this.generateProduct());
  }

  /**
   * Generate multiple test categories
   */
  static generateCategories(count: number): TestCategory[] {
    return Array.from({ length: count }, () => this.generateCategory());
  }
}

/**
 * File system utilities for tests
 */
export class FileUtils {
  /**
   * Create a temporary directory for testing
   */
  static async createTempDir(prefix: string = "saleor-test-"): Promise<string> {
    return new Promise((resolve, reject) => {
      tmp.dir({ prefix, unsafeCleanup: true }, (err, path) => {
        if (err) reject(err);
        else resolve(path);
      });
    });
  }

  /**
   * Check if a directory contains any files
   */
  static async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const files = await readdir(dirPath);
      return files.length === 0;
    } catch (error) {
      return true; // Directory doesn't exist, so it's "empty"
    }
  }

  /**
   * Get all files in a directory recursively
   */
  static async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    if (!existsSync(dirPath)) {
      return files;
    }

    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Copy directory contents
   */
  static async copyDirectory(source: string, destination: string): Promise<void> {
    await mkdir(destination, { recursive: true });

    const entries = await readdir(source);

    for (const entry of entries) {
      const sourcePath = join(source, entry);
      const destPath = join(destination, entry);
      const stats = await stat(sourcePath);

      if (stats.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath);
      } else {
        const content = await readFile(sourcePath);
        await writeFile(destPath, content);
      }
    }
  }

  /**
   * Clean up directory
   */
  static async cleanupDirectory(dirPath: string): Promise<void> {
    if (existsSync(dirPath)) {
      await rm(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Read YAML file content
   */
  static async readYamlFile(filePath: string): Promise<string> {
    return await readFile(filePath, "utf-8");
  }

  /**
   * Write YAML file content
   */
  static async writeYamlFile(filePath: string, content: string): Promise<void> {
    await writeFile(filePath, content, "utf-8");
  }

  /**
   * Modify YAML file by replacing content
   */
  static async modifyYamlFile(
    filePath: string,
    findPattern: string | RegExp,
    replacement: string
  ): Promise<void> {
    const content = await this.readYamlFile(filePath);
    const modifiedContent = content.replace(findPattern, replacement);
    await this.writeYamlFile(filePath, modifiedContent);
  }
}

/**
 * Configuration file utilities
 */
export class ConfigUtils {
  /**
   * Create a basic Saleor configuration
   */
  static createBasicConfig(): string {
    return `# Saleor Configuration
apiVersion: v1
kind: Configuration
metadata:
  name: test-config
  description: Test configuration for E2E tests
spec:
  products: []
  categories: []
  attributes: []
`;
  }

  /**
   * Create a product configuration
   */
  static createProductConfig(products: TestProduct[]): string {
    const productsYaml = products
      .map(
        (product) => `  - id: ${product.id}
    name: "${product.name}"
    slug: "${product.slug}"
    description: "${product.description}"
    price: ${product.price}
    category: "${product.category}"`
      )
      .join("\n");

    return `# Products Configuration
products:
${productsYaml}
`;
  }

  /**
   * Create a category configuration
   */
  static createCategoryConfig(categories: TestCategory[]): string {
    const categoriesYaml = categories
      .map(
        (category) => `  - id: ${category.id}
    name: "${category.name}"
    slug: "${category.slug}"
    description: "${category.description}"${
      category.parent ? `\n    parent: "${category.parent}"` : ""
    }`
      )
      .join("\n");

    return `# Categories Configuration
categories:
${categoriesYaml}
`;
  }
}

/**
 * Test assertion utilities
 */
export class TestAssertions {
  /**
   * Assert that a directory contains expected files
   */
  static async assertDirectoryContainsFiles(
    dirPath: string,
    expectedFiles: string[]
  ): Promise<void> {
    const files = await FileUtils.getAllFiles(dirPath);
    const fileNames = files.map((f) => f.split("/").pop()!);

    for (const expectedFile of expectedFiles) {
      if (!fileNames.includes(expectedFile)) {
        throw new Error(
          `Expected file '${expectedFile}' not found in directory '${dirPath}'. Found: ${fileNames.join(", ")}`
        );
      }
    }
  }

  /**
   * Assert that CLI output contains expected patterns
   */
  static assertOutputContains(output: string, patterns: (string | RegExp)[]): void {
    for (const pattern of patterns) {
      const match = typeof pattern === "string"
        ? output.includes(pattern)
        : pattern.test(output);

      if (!match) {
        throw new Error(
          `Expected output to contain pattern: ${pattern}\nActual output: ${output}`
        );
      }
    }
  }

  /**
   * Assert that CLI command was successful
   */
  static assertCommandSuccess(result: { success: boolean; stderr: string; command: string }): void {
    if (!result.success) {
      throw new Error(
        `Command failed: ${result.command}\nError: ${result.stderr}`
      );
    }
  }

  /**
   * Assert that CLI command failed with expected error
   */
  static assertCommandFailure(
    result: { success: boolean; stderr: string; command: string },
    expectedError?: string | RegExp
  ): void {
    if (result.success) {
      throw new Error(`Expected command to fail: ${result.command}`);
    }

    if (expectedError) {
      const match = typeof expectedError === "string"
        ? result.stderr.includes(expectedError)
        : expectedError.test(result.stderr);

      if (!match) {
        throw new Error(
          `Expected error pattern not found: ${expectedError}\nActual error: ${result.stderr}`
        );
      }
    }
  }
}

/**
 * Wait utilities for async operations
 */
export class WaitUtils {
  /**
   * Wait for a specified amount of time
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await condition();
      if (result) {
        return;
      }
      await this.sleep(interval);
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Wait for file to exist
   */
  static async waitForFile(filePath: string, timeout: number = 5000): Promise<void> {
    await this.waitFor(() => existsSync(filePath), { timeout });
  }
}