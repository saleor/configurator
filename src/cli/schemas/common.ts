import { z } from "zod";

/**
 * Common CLI argument definitions shared across all commands
 * Each argument includes validation rules and descriptive help text
 */
export const commonArgsDefinition = {
  url: z
    .string({ required_error: "Saleor GraphQL URL is required" })
    .url("Must be a valid URL")
    .describe("Saleor GraphQL endpoint URL"),

  token: z
    .string({ required_error: "Saleor authentication token is required" })
    .min(1, "Token cannot be empty")
    .describe("Saleor authentication token (staff user with proper permissions)"),

  config: z.string().default("config.yml").describe("Path to configuration file"),

  quiet: z
    .boolean()
    .default(false)
    .describe("Suppress progress messages and output only essential information"),

  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed debug information and execution logs"),

  force: z
    .boolean()
    .default(false)
    .describe("Skip confirmation prompts and overwrite files without asking"),

  dryRun: z
    .boolean()
    .default(false)
    .describe("Preview changes without making any modifications (dry-run mode)"),

  skipValidation: z
    .boolean()
    .default(false)
    .describe("Skip validation checks and diff comparison (advanced users only)"),
} as const;

/**
 * Create a Zod object schema from the common arguments
 * This is used when a command only needs common arguments
 */
export const createCommonArgsSchema = () => z.object(commonArgsDefinition);

/**
 * Utility function to extend common args with command-specific arguments
 * @param extensions - Additional schema fields to merge with common args
 * @returns A new Zod object schema combining common and extended arguments
 */
export function extendCommonArgs<T extends z.ZodRawShape>(
  extensions: T
): z.ZodObject<typeof commonArgsDefinition & T> {
  return z.object({ ...commonArgsDefinition, ...extensions });
}
