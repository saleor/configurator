/**
 * TypeScript Configuration Loader
 *
 * Handles loading and executing TypeScript configuration files
 */

import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { logger } from "../../../lib/logger";
import { EntityNotFoundError } from "../errors";
import type { SaleorConfig } from "../schema/schema";

/**
 * Load configuration from TypeScript file
 *
 * @param configPath - Path to the TypeScript config file
 * @returns Promise<SaleorConfig>
 */
export async function loadTypeScriptConfig(configPath: string): Promise<SaleorConfig> {
  logger.debug("Loading TypeScript configuration", { configPath });

  try {
    // Resolve absolute path
    const absolutePath = resolve(configPath);

    // Check if file exists by trying to read it
    try {
      await readFile(absolutePath, "utf-8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        logger.error("TypeScript configuration file not found", { path: configPath });
        throw new EntityNotFoundError(`Configuration file not found: ${configPath}`);
      }
      throw error;
    }

    // Convert to file URL for dynamic import
    const fileUrl = pathToFileURL(absolutePath).href;

    logger.debug("Importing TypeScript configuration", { fileUrl });

    // Dynamic import the TypeScript file
    // Note: This requires the file to be either:
    // 1. Already compiled to JavaScript
    // 2. Run with tsx/ts-node
    // 3. Have TypeScript loader configured
    const module = await import(fileUrl);

    // Extract the default export
    const config = module.default;

    if (!config) {
      throw new Error(
        `TypeScript config file must have a default export. ` +
          `Make sure your config file has: export default createSaleorConfig(...)`
      );
    }

    logger.info(`Loaded TypeScript configuration from ${configPath}`);
    logger.debug("TypeScript configuration content", { config });

    return config;
  } catch (error) {
    logger.error("Failed to load TypeScript configuration", {
      error,
      path: configPath,
    });
    throw error;
  }
}

/**
 * Determine if a config path is a TypeScript file
 */
export function isTypeScriptConfig(configPath: string): boolean {
  const ext = extname(configPath).toLowerCase();
  return ext === ".ts" || ext === ".mts";
}

/**
 * Load configuration from either YAML or TypeScript file
 *
 * This function auto-detects the file type and uses the appropriate loader
 */
export async function loadConfig(configPath: string): Promise<SaleorConfig> {
  if (isTypeScriptConfig(configPath)) {
    return loadTypeScriptConfig(configPath);
  }

  // Fall back to YAML loader (existing functionality)
  const { YamlConfigurationManager } = await import("../yaml-manager");
  const yamlManager = new YamlConfigurationManager(configPath);
  return yamlManager.load();
}
