import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

export interface TempDirectory {
  path: string;
  cleanup: () => void;
  createFile: (filename: string, content: string) => string;
  createSubDir: (dirname: string) => string;
  exists: (path: string) => boolean;
  readFile: (filename: string) => string;
}

export function createTempDirectory(prefix = "configurator-test"): TempDirectory {
  const randomSuffix = randomBytes(8).toString("hex");
  const dirPath = join(tmpdir(), `${prefix}-${randomSuffix}`);
  
  mkdirSync(dirPath, { recursive: true });
  
  return {
    path: dirPath,
    
    cleanup() {
      try {
        if (existsSync(dirPath)) {
          rmSync(dirPath, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Failed to cleanup temp directory ${dirPath}:`, error);
      }
    },
    
    createFile(filename: string, content: string): string {
      const filePath = join(dirPath, filename);
      writeFileSync(filePath, content, "utf8");
      return filePath;
    },
    
    createSubDir(dirname: string): string {
      const subDirPath = join(dirPath, dirname);
      mkdirSync(subDirPath, { recursive: true });
      return subDirPath;
    },
    
    exists(path: string): boolean {
      const fullPath = join(dirPath, path);
      return existsSync(fullPath);
    },
    
    readFile(filename: string): string {
      const filePath = join(dirPath, filename);
      return readFileSync(filePath, "utf8");
    },
  };
}

export function createInvalidConfigFile(tempDir: TempDirectory): string {
  const invalidYaml = `
shop:
  defaultMailSenderName: "Test Shop"
channels:
  - name: "Invalid Channel"
    # Missing required fields
    invalidField: true
productTypes:
  - # Missing name field
    slug: "invalid"
  - name: ""  # Empty name
    slug: "empty-name"
`;
  
  return tempDir.createFile("invalid-config.yml", invalidYaml);
}

export function createValidConfigFile(tempDir: TempDirectory): string {
  const validYaml = `
shop:
  defaultMailSenderName: "Test Shop"

channels:
  - name: "Test Channel"
    slug: "test-channel"
    currencyCode: "USD"
    isActive: true

productTypes:
  - name: "Test Product"
    slug: "test-product"
    hasVariants: false
    kind: "NORMAL"

pageTypes:
  - name: "Test Page"
    slug: "test-page"

categories:
  - name: "Test Category"
    slug: "test-category"
    description: "A test category"
`;
  
  return tempDir.createFile("valid-config.yml", validYaml);
}

export function createLargeConfigFile(tempDir: TempDirectory, itemCount = 100): string {
  const lines = [
    'shop:',
    '  defaultMailSenderName: "Large Config Shop"',
    '',
    'channels:',
    '  - name: "Main Channel"',
    '    slug: "main"',
    '    currencyCode: "USD"',
    '',
    'productTypes:',
  ];
  
  for (let i = 1; i <= itemCount; i++) {
    lines.push(`  - name: "Product Type ${i}"`);
    lines.push(`    slug: "product-type-${i}"`);
    lines.push(`    hasVariants: ${i % 2 === 0}`);
    lines.push(`    kind: "NORMAL"`);
  }
  
  lines.push('');
  lines.push('categories:');
  
  for (let i = 1; i <= itemCount; i++) {
    lines.push(`  - name: "Category ${i}"`);
    lines.push(`    slug: "category-${i}"`);
    lines.push(`    description: "Description for category ${i}"`);
  }
  
  return tempDir.createFile("large-config.yml", lines.join('\n'));
}

// Cleanup utility for tests
export function cleanupTempDirectories(): void {
  // This is a safety net - individual tests should handle their own cleanup
  const tempBase = tmpdir();
  const fs = require('node:fs');
  
  try {
    const entries = fs.readdirSync(tempBase);
    for (const entry of entries) {
      if (entry.startsWith('configurator-test-')) {
        const fullPath = join(tempBase, entry);
        try {
          rmSync(fullPath, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  } catch {
    // Ignore errors in global cleanup
  }
} 