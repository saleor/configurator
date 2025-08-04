/**
 * Unified Configuration Manager
 *
 * Handles both YAML and TypeScript configuration files
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { logger } from "../../lib/logger";
import type { SaleorConfig } from "./schema/schema";
import { generateTypeScriptConfig } from "./typescript/generator";
import { isTypeScriptConfig, loadTypeScriptConfig } from "./typescript/loader";
import { type ConfigurationStorage, YamlConfigurationManager } from "./yaml-manager";

export class UnifiedConfigurationManager implements ConfigurationStorage {
  constructor(private readonly configPath: string) {
    logger.debug("Initializing UnifiedConfigurationManager", { configPath });
  }

  async save(config: SaleorConfig): Promise<void> {
    if (isTypeScriptConfig(this.configPath)) {
      logger.debug("Saving as TypeScript configuration", { path: this.configPath });
      await this.saveAsTypeScript(config);
    } else {
      logger.debug("Saving as YAML configuration", { path: this.configPath });
      const yamlManager = new YamlConfigurationManager(this.configPath);
      await yamlManager.save(config);
    }
  }

  /**
   * Save configuration as TypeScript code
   */
  private async saveAsTypeScript(config: SaleorConfig): Promise<void> {
    try {
      // Generate TypeScript code
      const typescript = generateTypeScriptConfig(config);

      // Ensure directory exists
      const dir = dirname(this.configPath);
      await mkdir(dir, { recursive: true });

      // Write TypeScript file
      await writeFile(this.configPath, typescript, "utf-8");

      logger.info(`Saved TypeScript configuration to ${this.configPath}`);
    } catch (error) {
      logger.error("Failed to save TypeScript configuration", {
        error,
        path: this.configPath,
      });
      throw error;
    }
  }

  async load(): Promise<SaleorConfig> {
    if (isTypeScriptConfig(this.configPath)) {
      logger.debug("Loading TypeScript configuration", { path: this.configPath });
      return loadTypeScriptConfig(this.configPath);
    } else {
      logger.debug("Loading YAML configuration", { path: this.configPath });
      const yamlManager = new YamlConfigurationManager(this.configPath);
      return yamlManager.load();
    }
  }

  /**
   * Get the configuration file type
   */
  getConfigType(): "typescript" | "yaml" {
    return isTypeScriptConfig(this.configPath) ? "typescript" : "yaml";
  }
}
