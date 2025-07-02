/**
 * Command-Specific CLI Schemas
 * 
 * This module defines schemas for each CLI command, building upon the common arguments
 * and adding command-specific validation rules and options.
 */

import { z } from 'zod';
import { commonArgsDefinition, extendCommonArgs } from './common';

/**
 * Diff command specific argument definitions
 */
export const diffArgsDefinition = {
  format: z
    .enum(['table', 'json', 'summary'])
    .default('table')
    .describe("Output format: 'table' for human-readable, 'json' for structured data, 'summary' for brief overview"),
    
  filter: z
    .string()
    .optional()
    .describe("Filter by entity types (comma-separated: channels,shop,producttypes,pagetypes,categories)"),
} as const;

/**
 * Deploy command specific argument definitions
 * Inspired by Pulumi and modern deployment tools for better DX
 */
export const deployArgsDefinition = {
  plan: z
    .boolean()
    .default(false)
    .describe("Show deployment plan without applying changes (similar to Terraform plan)"),
    
  autoApprove: z
    .boolean()
    .default(false)
    .describe("Skip interactive approval and apply changes automatically"),
    
  target: z
    .string()
    .optional()
    .describe("Target specific resource types (comma-separated: channels,shop,producttypes,pagetypes,categories)"),
    
  diff: z
    .boolean()
    .default(true)
    .describe("Show diff before deployment (disable with --no-diff)"),
    
  continueOnError: z
    .boolean()
    .default(false)
    .describe("Continue deployment even if some resources fail"),
    
  parallelism: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe("Number of parallel resource operations (1-10)"),
    
  refreshOnly: z
    .boolean()
    .default(false)
    .describe("Only refresh state without making changes"),
} as const;

/**
 * Pre-defined command schemas for type safety and reusability
 * Each command combines common arguments with command-specific ones
 */
export const commandSchemas = {
  // Deploy command with enhanced deployment features
  deploy: extendCommonArgs(deployArgsDefinition),
  introspect: z.object(commonArgsDefinition),
  
  // Diff command extends common arguments with diff-specific ones
  diff: extendCommonArgs(diffArgsDefinition),
} as const;

/**
 * Utility function to get a specific command schema
 * @param commandName - The name of the command
 * @returns The schema for the specified command
 */
export function getCommandSchema<T extends keyof typeof commandSchemas>(
  commandName: T
): typeof commandSchemas[T] {
  return commandSchemas[commandName];
}

/**
 * Utility function to validate if a string is a valid command name
 * @param commandName - The command name to validate
 * @returns Type predicate indicating if the command name is valid
 */
export function isValidCommandName(commandName: string): commandName is keyof typeof commandSchemas {
  return commandName in commandSchemas;
}

/**
 * Get all available command names
 * @returns Array of all valid command names
 */
export function getAvailableCommands(): Array<keyof typeof commandSchemas> {
  return Object.keys(commandSchemas) as Array<keyof typeof commandSchemas>;
} 