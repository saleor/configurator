/**
 * Command-Specific CLI Schemas
 *
 * This module defines schemas for each CLI command, building upon the common arguments
 * and adding command-specific validation rules and options.
 */

import { z } from "zod";
import { commonArgsDefinition, extendCommonArgs } from "./common";

/**
 * Diff command specific argument definitions
 */
export const diffArgsDefinition = {
  format: z
    .enum(["table", "json", "summary"])
    .default("table")
    .describe(
      "Output format: 'table' for human-readable, 'json' for structured data, 'summary' for brief overview"
    ),

  filter: z
    .string()
    .optional()
    .describe(
      "Filter by entity types (comma-separated: channels,shop,producttypes,pagetypes,categories)"
    ),
} as const;

/**
 * Pre-defined command schemas for type safety and reusability
 * Each command combines common arguments with command-specific ones
 */
export const commandSchemas = {
  // Push and Introspect commands use only common arguments
  push: z.object(commonArgsDefinition),
  introspect: z.object(commonArgsDefinition),

  // Diff command extends common arguments with diff-specific ones
  diff: extendCommonArgs(diffArgsDefinition),
} as const;
