import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { shouldOutputJson } from "../cli/command";
import { buildEnvelope, outputEnvelope } from "../lib/json-envelope";
import { COMMAND_NAME } from "../meta";
import {
  checkConfiguration,
  summarizeUnknownKeys,
  type UnknownConfigKey,
} from "../modules/config/check-configuration";

const VALIDATE_EXIT = {
  SUCCESS: 0,
  /** Unparseable YAML; kept at 1 to match the previous (uncaught error) behaviour */
  PARSE_ERROR: 1,
  INVALID: 2,
} as const;

const validateCommandSchema = z.object({
  config: z.string().default("config.yml").describe("Configuration file path"),
  json: z.boolean().default(false).describe("Output validation results as JSON"),
  text: z.boolean().default(false).describe("Force human-readable output even in non-TTY mode"),
});

type ValidateCommandArgs = z.infer<typeof validateCommandSchema>;

interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

function formatZodErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function formatUnknownKeys(unknownKeys: readonly UnknownConfigKey[]): ValidationError[] {
  return summarizeUnknownKeys(unknownKeys).map(({ location, message }) => ({
    path: location,
    message,
  }));
}

function printTextWarnings(warnings: ValidationError[]): void {
  if (warnings.length === 0) return;
  console.warn("Warnings:\n");
  for (const warning of warnings) {
    console.warn(`  ${warning.message}`);
  }
  console.warn("");
}

function printTextSuccess(): void {
  console.log("Configuration is valid");
}

function printTextErrors(errors: ValidationError[], configPath: string): void {
  console.error(`Configuration file "${configPath}" has validation errors:\n`);
  for (const err of errors) {
    const location = err.path ? `  ${err.path}: ` : "  ";
    console.error(`${location}${err.message}`);
  }
}

export async function validateHandler(args: ValidateCommandArgs): Promise<void> {
  const { config: configPath } = args;
  const useJson = shouldOutputJson(args);

  let rawContent: string;

  try {
    rawContent = await readFile(configPath, "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : `Failed to read file: ${configPath}`;
    const validationResult: ValidationResult = {
      valid: false,
      errors: [{ path: "", message }],
      warnings: [],
    };

    if (useJson) {
      outputEnvelope(
        buildEnvelope({
          command: "validate",
          exitCode: VALIDATE_EXIT.INVALID,
          result: validationResult,
        })
      );
    } else {
      console.error(`Error: ${message}`);
    }

    process.exit(VALIDATE_EXIT.INVALID);
  }

  let rawConfig: unknown;

  try {
    rawConfig = parse(rawContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const validationResult: ValidationResult = {
      valid: false,
      errors: [{ path: "", message: `Invalid YAML: ${message}` }],
      warnings: [],
    };

    if (useJson) {
      outputEnvelope(
        buildEnvelope({
          command: "validate",
          exitCode: VALIDATE_EXIT.PARSE_ERROR,
          result: validationResult,
        })
      );
    } else {
      console.error(`Configuration file "${configPath}" is not valid YAML:\n\n${message}`);
    }

    process.exit(VALIDATE_EXIT.PARSE_ERROR);
  }

  const result = checkConfiguration(rawConfig);

  if (result.success) {
    const warnings = formatUnknownKeys(result.unknownKeys);
    const validationResult: ValidationResult = { valid: true, errors: [], warnings };

    if (useJson) {
      outputEnvelope(
        buildEnvelope({
          command: "validate",
          exitCode: VALIDATE_EXIT.SUCCESS,
          result: validationResult,
        })
      );
    } else {
      printTextWarnings(warnings);
      printTextSuccess();
    }
    process.exit(VALIDATE_EXIT.SUCCESS);
  }

  const errors = formatZodErrors(result.error);
  const validationResult: ValidationResult = { valid: false, errors, warnings: [] };

  if (useJson) {
    outputEnvelope(
      buildEnvelope({
        command: "validate",
        exitCode: VALIDATE_EXIT.INVALID,
        result: validationResult,
      })
    );
  } else {
    printTextErrors(errors, configPath);
  }

  process.exit(VALIDATE_EXIT.INVALID);
}

export const validateCommandConfig: CommandConfig<typeof validateCommandSchema> = {
  name: "validate",
  description: "Validates the local configuration file against the schema (no network required)",
  schema: validateCommandSchema,
  handler: validateHandler,
  requiresInteractive: false,
  examples: [
    `${COMMAND_NAME} validate`,
    `${COMMAND_NAME} validate --config custom-config.yml`,
    `${COMMAND_NAME} validate --json`,
  ],
};
