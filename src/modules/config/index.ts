/**
 * Configuration Module
 *
 * Exports both YAML and TypeScript configuration functionality
 */

// Service and repository
export { ConfigurationService } from "./config-service";
// Errors
export * from "./errors";
export { ConfigurationRepository } from "./repository";
export type { SaleorConfig } from "./schema/schema";

// Schema and types
export { configSchema } from "./schema/schema";
// TypeScript Configuration (new)
export { attribute, createSaleorConfig } from "./typescript";
export { isTypeScriptConfig, loadConfig, loadTypeScriptConfig } from "./typescript/loader";
export type { ConfigurationStorage, FileSystem } from "./yaml-manager";
// YAML Configuration (existing)
export { DEFAULT_CONFIG_PATH, YamlConfigurationManager } from "./yaml-manager";
