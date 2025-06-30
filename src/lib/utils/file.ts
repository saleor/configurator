/**
 * File System Utilities
 *
 * This module provides file system operations including file existence checks,
 * backup creation, and path manipulation utilities.
 */

import * as fs from "fs";
import { logger } from "../logger";

/**
 * Checks if a file exists
 * @param filePath - Path to the file to check
 * @returns True if the file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Creates a backup file path with timestamp
 * @param originalPath - Original file path
 * @returns Backup file path with timestamp
 */
export function createBackupPath(originalPath: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const parts = originalPath.split(".");
  const extension = parts.pop();
  const baseName = parts.join(".");
  return `${baseName}.backup.${timestamp}.${extension}`;
}

/**
 * Creates a backup of the specified file
 * @param filePath - Path to the file to backup
 * @returns Promise resolving to backup path or null if backup failed
 */
export async function createBackup(filePath: string): Promise<string | null> {
  try {
    if (!fileExists(filePath)) {
      return null; // No file to backup
    }

    const backupPath = createBackupPath(filePath);
    await fs.promises.copyFile(filePath, backupPath);
    return backupPath;
  } catch (error) {
    logger.warn(`Failed to create backup of ${filePath}`, { error });
    return null;
  }
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath - Directory path to ensure exists
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code !== "EEXIST") {
      throw error;
    }
  }
}

/**
 * Reads a file and returns its content as string
 * @param filePath - Path to the file to read
 * @returns Promise resolving to file content
 */
export async function readFile(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Writes content to a file
 * @param filePath - Path to the file to write
 * @param content - Content to write
 */
export async function writeFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.promises.writeFile(filePath, content, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to write file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
