/**
 * Saleor Configurator CLI
 *
 * This is the main entry point for the CLI system, providing a clean, unified API
 * for all CLI functionality including argument parsing, validation, help display, and error handling.
 */

import { z } from "zod";
import {
  environmentToCliArgs,
  extractEnvironmentDefaults,
} from "./args/environment";
import { hasHelpRequest, parseRawArguments } from "./args/parser";
import { formatValidationErrors, validateArguments } from "./args/validator";
import { displayHelp } from "./help/display";
import type { ArgumentParsingOptions } from "./schemas/types";

// Core functionality exports
export {
  environmentToCliArgs,
  extractEnvironmentDefaults,
} from "./args/environment";
export { hasHelpRequest, parseRawArguments } from "./args/parser";
export {
  categorizeSchemaFields,
  extractSchemaDescriptions,
  formatValidationErrors,
  validateArguments,
} from "./args/validator";

// Schema exports
export { commandSchemas } from "./schemas/commands";
export { commonArgsDefinition, extendCommonArgs } from "./schemas/common";
export type {
  ArgumentParsingOptions,
  EnvironmentVariables,
  ParsedArgs,
} from "./schemas/types";

// Error handling exports
export {
  createCliError,
  createValidationError,
  displayErrorWithContext,
  handleCommandError,
} from "./errors/handlers";
export { isCliError, isValidationError } from "./errors/types";
export type {
  CliError,
  HelpDisplayOptions,
  ValidationError,
} from "./errors/types";

// Help system exports
export { displayHelp } from "./help/display";
export { formatArgumentSection, generateHelpSections } from "./help/formatter";

// Validation exports
export {
  validateConfigPath,
  validateFormat,
  validateSaleorUrl,
} from "./validation";

// Display exports
export {
  displayConfig,
  displayProgress,
  displaySuccess,
  displayWarning,
  setupLogger,
} from "./display";
export type { BaseCommandArgs } from "./display";

// Interactive exports
export { confirmPrompt, displayDiffSummary, selectPrompt } from "./interactive";
export type { DiffSummary } from "./interactive";

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
  commandName: string = "command",
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

      const errorMessages = formatValidationErrors(
        validationResult.error.issues
      );
      errorMessages.forEach((msg: string) => {
        console.error(`  • ${msg}`);
      });

      console.error(
        `\n💡 Run 'npm run ${commandName} -- --help' for usage information`
      );
      process.exit(1);
    }

    return validationResult.data;
  } catch (error) {
    if (error instanceof Error && "isCliError" in error) {
      const cliError = error as import("./errors/types").CliError;
      console.error(`❌ ${cliError.message}`);

      if (cliError.helpText) {
        console.error(`\n💡 ${cliError.helpText}`);
      }

      console.error(
        `\n🔍 Run 'npm run ${commandName} -- --help' for usage information`
      );
    } else {
      console.error(
        `❌ Unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    process.exit(1);
  }
}
