/**
 * Saleor Configurator CLI
 * 
 * This is the main entry point for the CLI system, providing a clean, unified API
 * for all CLI functionality including argument parsing, validation, help display, and error handling.
 */

import { z } from 'zod';
import type { ArgumentParsingOptions } from './schemas/types';
import { parseRawArguments, hasHelpRequest } from './args/parser';
import { extractEnvironmentDefaults, environmentToCliArgs } from './args/environment';
import { validateArguments, formatValidationErrors } from './args/validator';
import { displayHelp } from './help/display';
import { extendCommonArgs } from './schemas/common';

// Core functionality exports
export { parseRawArguments, hasHelpRequest } from './args/parser';
export { extractEnvironmentDefaults, environmentToCliArgs } from './args/environment';
export { 
  extractSchemaDescriptions, 
  validateArguments, 
  formatValidationErrors,
  categorizeSchemaFields 
} from './args/validator';

// Schema exports
export { commandSchemas, getCommandSchema, isValidCommandName } from './schemas/commands';
export { commonArgsDefinition, createCommonArgsSchema, extendCommonArgs } from './schemas/common';
export type { 
  ParsedArgs, 
  EnvironmentVariables, 
  ArgumentParsingOptions
} from './schemas/types';

// Error handling exports
export { createCliError, createValidationError, handleCliError, handleCommandError, displayErrorWithContext } from './errors/handlers';
export { isCliError, isValidationError } from './errors/types';
export type { CliError, ValidationError, HelpDisplayOptions } from './errors/types';

// Help system exports
export { displayHelp, displayUsage, displayErrorWithHelp } from './help/display';
export { generateHelpSections, formatArgumentSection } from './help/formatter';

// Validation exports
export { validateSaleorUrl, validateConfigPath, validateFormat } from './validation';

// Display exports
export { setupLogger, displayConfig, displayProgress, displaySuccess, displayWarning } from './display';
export type { BaseCommandArgs } from './display';

// Interactive exports
export { confirmPrompt, selectPrompt, displayDiffSummary } from './interactive';
export type { PromptOptions, DiffSummary } from './interactive';

/**
 * Main CLI argument parsing function with comprehensive error handling and help support
 * 
 * This is the primary function used by commands to parse and validate their arguments.
 * It handles help requests, environment variables, validation, and error reporting.
 * 
 * @param schema - Zod schema defining the expected arguments
 * @param commandName - Name of the command (for help and error messages)
 * @param options - Parsing options (argv and environment variables)
 * @returns Validated and parsed arguments
 */
export function parseCliArgs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  commandName: string = 'command',
  options: Partial<ArgumentParsingOptions> = {}
): z.infer<z.ZodObject<T>> {
  const argv = options.argv ?? process.argv.slice(2);
  const env = options.env ?? extractEnvironmentDefaults();

  // Handle help request early
  if (hasHelpRequest(argv)) {
    displayHelp({ commandName, schema });
    process.exit(0);
  }

  try {
    // Parse command line arguments
    const parsedArgs = parseRawArguments(argv);
    
    // Merge with environment variables (CLI args take precedence)
    const envDefaults = environmentToCliArgs(env);
    const finalArgs = { ...envDefaults, ...parsedArgs };

    // Validate against schema
    const validationResult = validateArguments(schema, finalArgs);
    
    if (!validationResult.success) {
      console.error("❌ Invalid arguments provided:\n");
      
      const errorMessages = formatValidationErrors(validationResult.error.issues);
      errorMessages.forEach((msg: string) => {
        console.error(`  • ${msg}`);
      });
      
      console.error(`\n💡 Run 'npm run ${commandName} -- --help' for usage information`);
      process.exit(1);
    }

    return validationResult.data;
    
  } catch (error) {
    if (error instanceof Error && 'isCliError' in error) {
      const cliError = error as import('./errors/types').CliError;
      console.error(`❌ ${cliError.message}`);
      
      if (cliError.helpText) {
        console.error(`\n💡 ${cliError.helpText}`);
      }
      
      console.error(`\n🔍 Run 'npm run ${commandName} -- --help' for usage information`);
    } else {
      console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    process.exit(1);
  }
}

/**
 * Utility function to create a command parser with pre-configured schema
 * This provides a more functional approach to command definition
 * 
 * @param commandName - Name of the command
 * @param schema - Zod schema for the command
 * @returns Parser function that can be called with argv and env options
 */
export function createCommandParser<T extends z.ZodRawShape>(
  commandName: string,
  schema: z.ZodObject<T>
) {
  return (options?: Partial<ArgumentParsingOptions>): z.infer<z.ZodObject<T>> => {
    return parseCliArgs(schema, commandName, options);
  };
}

/**
 * Utility function for quick command setup with common patterns
 * This is a convenience function that combines schema creation with parsing
 * 
 * @param commandName - Name of the command
 * @param extensions - Additional schema fields beyond common args
 * @param options - Parsing options
 * @returns Parsed and validated arguments
 */
export function setupCommand<T extends z.ZodRawShape>(
  commandName: string, 
  extensions: T = {} as T,
  options?: Partial<ArgumentParsingOptions>
) {
  const schema = extendCommonArgs(extensions);
  return parseCliArgs(schema, commandName, options);
} 