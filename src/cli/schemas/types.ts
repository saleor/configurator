/**
 * CLI Schema Type Definitions
 *
 * This module provides essential type definitions for CLI functionality,
 * using Zod's built-in type inference where possible to avoid redundancy.
 */

import type { z } from "zod";

/**
 * Base interface for parsed CLI arguments (before schema validation)
 * CLI arguments are always strings, booleans, or undefined
 */
export interface ParsedArgs {
  readonly [key: string]: string | boolean | undefined;
}

/**
 * Environment variable configuration for Saleor CLI
 */
export interface EnvironmentVariables {
  readonly SALEOR_API_URL?: string;
  readonly SALEOR_AUTH_TOKEN?: string;
  readonly SALEOR_CONFIG_PATH?: string;
}

/**
 * Options for CLI argument parsing
 */
export interface ArgumentParsingOptions {
  readonly argv: readonly string[];
  readonly env: EnvironmentVariables;
}

/**
 * Type helper for schema validation results using Zod's built-in types
 */
export type SchemaValidationResult<T extends z.ZodObject<z.ZodRawShape>> = z.SafeParseReturnType<
  z.input<T>,
  z.output<T>
>;
