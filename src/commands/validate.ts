import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { COMMAND_NAME } from "../meta";
import { configSchema } from "../modules/config/schema/schema";

const VALIDATE_EXIT = {
  SUCCESS: 0,
  INVALID: 2,
} as const;

export const validateCommandSchema = z.object({
  config: z.string().default("config.yml").describe("Configuration file path"),
  json: z.boolean().default(false).describe("Output validation results as JSON"),
});

export type ValidateCommandArgs = z.infer<typeof validateCommandSchema>;

interface ValidationError {
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function formatZodErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function printJsonResult(result: ValidationResult): void {
  console.log(JSON.stringify(result));
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
  const { config: configPath, json } = args;

  let rawContent: string;

  try {
    rawContent = await readFile(configPath, "utf-8");
  } catch (err) {
    const message = err instanceof Error ? err.message : `Failed to read file: ${configPath}`;

    if (json) {
      printJsonResult({
        valid: false,
        errors: [{ path: "", message }],
      });
    } else {
      console.error(`Error: ${message}`);
    }

    process.exit(VALIDATE_EXIT.INVALID);
  }

  const rawConfig = parse(rawContent);
  const result = configSchema.safeParse(rawConfig);

  if (result.success) {
    if (json) {
      printJsonResult({ valid: true, errors: [] });
    } else {
      printTextSuccess();
    }
    process.exit(VALIDATE_EXIT.SUCCESS);
  }

  const errors = formatZodErrors(result.error);

  if (json) {
    printJsonResult({ valid: false, errors });
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
