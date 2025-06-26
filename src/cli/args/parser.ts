/**
 * CLI Argument Parser
 * 
 * This module handles the core parsing of command line arguments into structured objects.
 * It provides robust parsing with support for various argument formats and proper error handling.
 */

import type { ParsedArgs } from '../schemas/types';
import { createCliError } from '../errors/handlers';

/**
 * Result of parsing a single argument
 */
interface ArgumentParseResult {
  readonly key: string;
  readonly value: string | boolean;
  readonly skipNext: boolean;
}

/**
 * Configuration for argument parsing behavior
 */
interface ParsingConfig {
  readonly allowUnknownArgs: boolean;
  readonly caseSensitive: boolean;
  readonly argumentPrefix: string;
}

/**
 * Default parsing configuration
 */
const DEFAULT_PARSING_CONFIG: ParsingConfig = {
  allowUnknownArgs: true,
  caseSensitive: true,
  argumentPrefix: '--',
} as const;

/**
 * Parse command line arguments into a structured object
 * Supports multiple argument formats: --key=value, --key value, --flag
 * 
 * @param argv - Array of command line arguments
 * @param config - Configuration for parsing behavior
 * @returns Parsed arguments object
 */
export function parseRawArguments(
  argv: readonly string[], 
  config: ParsingConfig = DEFAULT_PARSING_CONFIG
): ParsedArgs {
  const parsedArgs: Record<string, string | boolean> = {};
  const errors: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    // Skip non-option arguments
    if (!arg.startsWith(config.argumentPrefix)) {
      continue;
    }

    try {
      const parseResult = parseArgument(arg, argv[i + 1], config);
      
      // Check for duplicate arguments
      if (parseResult.key in parsedArgs) {
        errors.push(`Duplicate argument: ${config.argumentPrefix}${parseResult.key}`);
        continue;
      }
      
      parsedArgs[parseResult.key] = parseResult.value;
      
      if (parseResult.skipNext) {
        i++; // Skip the next argument if it was consumed as a value
      }
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }
  }

  // Report parsing errors if any
  if (errors.length > 0) {
    throw createCliError(
      `Failed to parse arguments: ${errors.join(', ')}`,
      "Check your argument syntax and try again"
    );
  }

  return parsedArgs;
}

/**
 * Parse a single argument and its potential value
 * Handles different argument formats and validates input
 * 
 * @param arg - The current argument
 * @param nextArg - The next argument (potential value)
 * @param config - Parsing configuration
 * @returns Parsed argument result
 */
function parseArgument(
  arg: string, 
  nextArg: string | undefined,
  config: ParsingConfig
): ArgumentParseResult {
  const argWithoutPrefix = arg.slice(config.argumentPrefix.length);
  
  // Validate argument format
  if (argWithoutPrefix.length === 0) {
    throw new Error(`Invalid argument format: ${arg}`);
  }

  // Handle --key=value format
  if (argWithoutPrefix.includes('=')) {
    return parseKeyValueArgument(argWithoutPrefix);
  }

  // Handle --key value format and boolean flags
  return parseSpaceSeparatedArgument(argWithoutPrefix, nextArg, config);
}

/**
 * Parse arguments in --key=value format
 * @param argWithoutPrefix - Argument string without the prefix
 * @returns Parsed argument result
 */
function parseKeyValueArgument(argWithoutPrefix: string): ArgumentParseResult {
  const equalIndex = argWithoutPrefix.indexOf('=');
  const key = argWithoutPrefix.slice(0, equalIndex);
  const value = argWithoutPrefix.slice(equalIndex + 1);
  
  if (key.length === 0) {
    throw new Error(`Invalid argument: missing key in ${argWithoutPrefix}`);
  }
  
  return {
    key,
    value: value.length > 0 ? value : '',
    skipNext: false,
  };
}

/**
 * Parse arguments in --key value format or boolean flags
 * @param key - The argument key
 * @param nextArg - The next argument (potential value)
 * @param config - Parsing configuration
 * @returns Parsed argument result
 */
function parseSpaceSeparatedArgument(
  key: string,
  nextArg: string | undefined,
  config: ParsingConfig
): ArgumentParseResult {
  // If next argument exists and doesn't start with prefix, treat as value
  if (nextArg && !nextArg.startsWith(config.argumentPrefix)) {
    return {
      key,
      value: nextArg,
      skipNext: true,
    };
  }

  // Otherwise, treat as boolean flag
  return {
    key,
    value: true,
    skipNext: false,
  };
}

/**
 * Normalize argument keys for consistent processing
 * @param key - The argument key to normalize
 * @param caseSensitive - Whether to preserve case
 * @returns Normalized key
 */
export function normalizeArgumentKey(key: string, caseSensitive: boolean = true): string {
  const normalized = caseSensitive ? key : key.toLowerCase();
  
  // Convert kebab-case to camelCase for consistency
  return normalized.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Check if a string represents a help request
 * @param arg - Argument to check
 * @returns True if the argument is requesting help
 */
export function isHelpRequest(arg: string): boolean {
  const helpFlags = ['--help', '-h', '--usage', '-?'];
  return helpFlags.includes(arg.toLowerCase());
}

/**
 * Extract help requests from argument list
 * @param argv - Command line arguments
 * @returns True if help was requested
 */
export function hasHelpRequest(argv: readonly string[]): boolean {
  return argv.some(isHelpRequest);
} 