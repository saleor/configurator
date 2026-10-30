import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
