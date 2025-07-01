/**
 * Environment Variable Handling
 *
 * This module handles extraction and processing of environment variables
 * used by CLI commands, providing a clean interface for environment-based configuration.
 */

import type { EnvironmentVariables } from "../schemas/types";

/**
 * Configuration for environment variable processing
 */
interface EnvironmentConfig {
  readonly prefix: string;
  readonly mappings: Record<string, string>;
}

/**
 * Default environment variable configuration for Saleor CLI
 */
const DEFAULT_ENV_CONFIG: EnvironmentConfig = {
  prefix: "SALEOR_",
  mappings: {
    url: "SALEOR_API_URL",
    token: "SALEOR_AUTH_TOKEN",
    config: "SALEOR_CONFIG_PATH",
  },
} as const;

/**
 * Extract relevant environment variables for CLI usage
 * @param env - Environment variables object (defaults to process.env)
 * @param config - Configuration for environment processing
 * @returns Extracted and validated environment variables
 */
export function extractEnvironmentDefaults(
  env: NodeJS.ProcessEnv = process.env,
  config: EnvironmentConfig = DEFAULT_ENV_CONFIG
): EnvironmentVariables {
  return {
    SALEOR_API_URL: env[config.mappings.url],
    SALEOR_AUTH_TOKEN: env[config.mappings.token],
    SALEOR_CONFIG_PATH: env[config.mappings.config],
  };
}

/**
 * Convert environment variables to CLI argument format
 * @param envVars - Processed environment variables
 * @returns Object with CLI argument keys mapped to environment values
 */
export function environmentToCliArgs(
  envVars: EnvironmentVariables
): Record<string, string | undefined> {
  return {
    url: envVars.SALEOR_API_URL,
    token: envVars.SALEOR_AUTH_TOKEN,
    config: envVars.SALEOR_CONFIG_PATH,
  };
}

/**
 * Get environment variable help text for documentation
 * @param config - Environment configuration
 * @returns Formatted help text explaining environment variables
 */
export function getEnvironmentHelpText(
  config: EnvironmentConfig = DEFAULT_ENV_CONFIG
): string {
  const lines = [
    "🌍 Environment Variables:",
    "  You can set these environment variables instead of using CLI arguments:",
    "",
  ];

  Object.entries(config.mappings).forEach(([cliArg, envVar]) => {
    lines.push(`  ${envVar} - Sets the --${cliArg} argument`);
  });

  lines.push(
    "",
    "  Example:",
    `  export SALEOR_API_URL=https://demo.saleor.io/graphql/`,
    `  export SALEOR_AUTH_TOKEN=your-authentication-token`,
    ""
  );

  return lines.join("\n");
}
