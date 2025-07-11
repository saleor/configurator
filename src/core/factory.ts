/**
 * Configurator Factory
 *
 * This module provides factory functions for creating and configuring
 * SaleorConfigurator instances with the proper dependencies.
 */

import { createClient } from "../lib/graphql/client";
import { SaleorConfigurator } from "./configurator";
import { ServiceComposer } from "./service-container";

/**
 * Creates and configures a Saleor configurator with all dependencies
 * @param token - Authentication token
 * @param url - Saleor GraphQL URL
 * @param configPath - Path to configuration file
 * @returns Configured SaleorConfigurator instance
 */
export function createConfigurator(
  token: string,
  url: string,
  configPath: string
): SaleorConfigurator {
  const client = createClient(token, url);
  const services = ServiceComposer.compose(client, configPath);
  return new SaleorConfigurator(services);
}

/**
 * Creates a configurator for read-only operations (introspection, diff)
 * @param token - Authentication token
 * @param url - Saleor GraphQL URL
 * @param configPath - Path to configuration file
 * @returns Configured SaleorConfigurator instance optimized for read operations
 */
export function createReadOnlyConfigurator(
  token: string,
  url: string,
  configPath: string
): SaleorConfigurator {
  // For now, same as regular configurator - could be optimized in the future
  return createConfigurator(token, url, configPath);
}

/**
 * Configuration options for configurator creation
 */
export interface ConfiguratorOptions {
  readonly token: string;
  readonly url: string;
  readonly configPath: string;
  readonly readOnly?: boolean;
}

/**
 * Creates a configurator with options object
 * @param options - Configuration options
 * @returns Configured SaleorConfigurator instance
 */
export function createConfiguratorWithOptions(options: ConfiguratorOptions): SaleorConfigurator {
  if (options.readOnly) {
    return createReadOnlyConfigurator(options.token, options.url, options.configPath);
  }
  return createConfigurator(options.token, options.url, options.configPath);
}
