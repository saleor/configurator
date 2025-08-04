/**
 * TypeScript Configuration Builder
 *
 * Main entry point for creating Saleor configurations in TypeScript
 */

import { ZodValidationError } from "../../../lib/errors/zod";
import { logger } from "../../../lib/logger";
import { configSchema, type SaleorConfig } from "../schema/schema";
import type { ConfigInput } from "./types";

/**
 * Create and validate a Saleor configuration
 *
 * This function provides the main entry point for TypeScript configurations.
 * It validates the configuration against the same Zod schema used for YAML configs
 * to ensure consistency and type safety.
 *
 * @param config - The configuration object
 * @returns Validated Saleor configuration
 *
 * @example
 * ```typescript
 * import { createSaleorConfig, shop, channel } from '@saleor/configurator'
 *
 * export default createSaleorConfig({
 *   shop: shop.create({
 *     defaultMailSenderName: "My Store",
 *     displayGrossPrices: true,
 *   }),
 *   channels: [
 *     channel.create({
 *       name: "US Store",
 *       slug: "us",
 *       currencyCode: "USD",
 *       defaultCountry: "US",
 *     })
 *   ]
 * })
 * ```
 */
export function createSaleorConfig(config: ConfigInput): SaleorConfig {
  logger.debug("Creating Saleor configuration from TypeScript", { config });

  try {
    // Validate the configuration using the same Zod schema as YAML configs
    const result = configSchema.safeParse(config);

    if (!result.success) {
      logger.error("TypeScript configuration validation failed", {
        errors: result.error.issues,
      });

      throw ZodValidationError.fromZodError(
        result.error,
        "TypeScript configuration validation failed"
      );
    }

    logger.debug("TypeScript configuration validated successfully", {
      config: result.data,
    });

    return result.data;
  } catch (error) {
    logger.error("Failed to create Saleor configuration", { error });
    throw error;
  }
}

/**
 * Create a partial Saleor configuration for development/testing
 *
 * This function allows creating partial configurations that may not pass
 * full validation, useful during development or for testing scenarios.
 *
 * @param config - Partial configuration object
 * @returns Partial configuration (not validated)
 */
export function createPartialSaleorConfig(config: Partial<ConfigInput>): Partial<SaleorConfig> {
  logger.debug("Creating partial Saleor configuration", { config });
  return config;
}

/**
 * Validate a configuration without creating it
 *
 * Useful for testing or validation-only scenarios
 *
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateSaleorConfig(config: ConfigInput): {
  success: boolean;
  data?: SaleorConfig;
  errors?: string[];
} {
  try {
    const result = configSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${path}: ${issue.message}`;
      });

      return {
        success: false,
        errors,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
