import { Command, Option } from "@commander-js/extra-typings";
import { confirm, input, password, select } from "@inquirer/prompts";
import { z } from "zod";
import { isNonInteractiveEnvironment } from "../lib/ci-mode";
import { ZodValidationError } from "../lib/errors/zod";
import { safePath, safeToken, saleorUrl } from "../lib/validation";
import { type Console, cliConsole, textStyle } from "./console";

export interface CommandHandler<T extends Record<string, unknown>, R> {
  console: Console;
  execute(args: T): Promise<R>;
}

export const baseCommandArgsSchema = z.object({
  url: saleorUrl().describe("Saleor instance URL"),
  token: safeToken().describe("Saleor API token"),
  config: safePath().default("config.yml").describe("Configuration file path"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export function shouldOutputJson(args: { json?: boolean; text?: boolean }): boolean {
  if (args.text === true) return false;
  if (args.json === true) return true;
  return isNonInteractiveEnvironment();
}

export type BaseCommandArgs = z.infer<typeof baseCommandArgsSchema>;

/**
 * Prompts for missing required arguments interactively.
 * Command-specific args (anything outside the base schema) are passed through untouched.
 */
export async function promptForMissingArgs<T extends Partial<BaseCommandArgs>>(
  args: T,
  requiredFields: Array<keyof BaseCommandArgs> = ["url", "token"]
): Promise<Omit<T, keyof BaseCommandArgs> & BaseCommandArgs> {
  const result: Partial<BaseCommandArgs> = { ...args };

  // Prompt for URL if missing
  if (requiredFields.includes("url") && !result.url) {
    result.url = await input({
      message: "Enter your Saleor instance URL:",
      validate: (value) => {
        if (!value) return "URL is required";
        try {
          new URL(value);
          return true;
        } catch {
          return "Please enter a valid URL (e.g., https://your-store.saleor.cloud/graphql/)";
        }
      },
      default: "https://your-store.saleor.cloud/graphql/",
    });
  }

  // Prompt for token if missing
  if (requiredFields.includes("token") && !result.token) {
    result.token = await password({
      message: "Enter your Saleor API token:",
      validate: (value) => {
        if (!value) return "Token is required";
        if (value.length < 10) return "Token seems too short";
        return true;
      },
      mask: "*",
    });
  }

  return { ...args, ...baseCommandArgsSchema.parse(result) };
}

/**
 * Prompts for confirmation with enhanced messaging
 */
export async function confirmAction(
  message: string,
  details?: string,
  defaultValue = false,
  useStderr = false
): Promise<boolean> {
  if (details) {
    if (useStderr) {
      process.stderr.write(`\n⚠️  ${details}\n`);
    } else {
      cliConsole.warn(`\n⚠️  ${details}\n`);
    }
  }

  return confirm(
    { message, default: defaultValue },
    useStderr ? { output: process.stderr } : undefined
  );
}

/**
 * Prompts for selection from a list of options
 */
export async function selectOption<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; description?: string }>
): Promise<T> {
  return select({
    message,
    choices,
  });
}

export function mergeEnvArgs<T extends Record<string, unknown>>(args: T): T {
  const definedArgs = Object.fromEntries(Object.entries(args).filter(([, v]) => v !== undefined));
  return {
    ...(process.env.SALEOR_URL !== undefined &&
      args.url === undefined && { url: process.env.SALEOR_URL }),
    ...(process.env.SALEOR_TOKEN !== undefined &&
      args.token === undefined && { token: process.env.SALEOR_TOKEN }),
    ...(process.env.SALEOR_CONFIG !== undefined &&
      args.config === undefined && { config: process.env.SALEOR_CONFIG }),
    ...definedArgs,
  } as T;
}

/**
 * Removes option values that Commander filled in from defaults, so env vars
 * (e.g. SALEOR_CONFIG) can take precedence over them. The schema re-applies the
 * same defaults during validation.
 */
export function omitDefaultOptionValues(
  options: Record<string, unknown>,
  command: Pick<Command, "getOptionValueSource">
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).filter(([key]) => command.getOptionValueSource(key) !== "default")
  );
}

export interface CommandConfig<T extends z.ZodObject<Record<string, z.ZodTypeAny>>> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<void>;
  examples?: string[];
  requiresInteractive?: boolean;
}

function unwrapOptionalAndDefault(field: z.ZodTypeAny): z.ZodTypeAny {
  let current = field;
  while (current instanceof z.ZodOptional || current instanceof z.ZodDefault) {
    current = current._def.innerType as z.ZodTypeAny;
  }
  return current;
}

export function isBooleanField(field: z.ZodTypeAny): boolean {
  return unwrapOptionalAndDefault(field) instanceof z.ZodBoolean;
}

export function toKebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function getOptionConfigFromZodForCommander(key: string, field: z.ZodTypeAny) {
  const isBoolean = isBooleanField(field);
  const flagName = toKebabCase(key);

  return {
    flags: isBoolean ? `--${flagName}` : `--${flagName} <${flagName}>`,
    // camelCase spelling kept as a hidden alias for backwards compatibility
    aliasFlags: flagName === key ? undefined : isBoolean ? `--${key}` : `--${key} <${flagName}>`,
    isBoolean,
    description: field.description || key,
    defaultValue:
      field instanceof z.ZodDefault
        ? typeof field._def.defaultValue === "function"
          ? field._def.defaultValue()
          : field._def.defaultValue
        : undefined,
  };
}

function generateOptionsFromSchema(
  command: Command,
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>
): void {
  const shape = schema.shape;

  Object.entries(shape).forEach(([key, field]) => {
    const { flags, aliasFlags, isBoolean, description, defaultValue } =
      getOptionConfigFromZodForCommander(key, field);

    // Commander derives the attribute name from the flag ("--fail-on-delete" and
    // "--failOnDelete" both map to "failOnDelete"), so both spellings share one key.
    const option = new Option(flags, description);
    if (!isBoolean && defaultValue !== undefined) {
      option.default(defaultValue as string);
    }
    command.addOption(option);

    if (isBoolean && defaultValue === true) {
      command.addOption(
        new Option(
          `--no-${toKebabCase(key)}`,
          `Do not ${description[0].toLowerCase()}${description.slice(1)}`
        )
      );
    }

    if (aliasFlags) {
      command.addOption(new Option(aliasFlags, description).hideHelp());
    }
  });
}

/**
 * Creates a Commander.js command with enhanced TypeScript support and interactive prompts
 */
export function createCommand<T extends z.ZodObject<Record<string, z.ZodTypeAny>>>(
  config: CommandConfig<T>
): Command {
  const command = new Command().name(config.name).description(config.description);

  // Dynamically generate options ("-u, --url <url>", etc) from baseCommandArgsSchema
  // ! shorthands (e.g. -u) are not generated properly
  generateOptionsFromSchema(command, config.schema);

  // Add examples to help
  if (config.examples?.length) {
    const originalHelp = command.helpInformation.bind(command);
    command.helpInformation = () => {
      let help = originalHelp();
      help += `\n${textStyle.important("Examples:")}\n`;
      for (const example of config.examples ?? []) {
        help += `${textStyle.hint(`  ${example}`)}\n`;
      }
      return help;
    };
  }

  // Set action with interactive prompts and validation
  command.action(async (options: unknown, _command: unknown) => {
    try {
      // Handle interactive mode for missing arguments
      let validatedArgs: z.infer<T>;

      const args = mergeEnvArgs(
        omitDefaultOptionValues(options as Record<string, unknown>, command) as Partial<z.infer<T>>
      );
      if (config.requiresInteractive && (!args.url || !args.token)) {
        cliConsole.info("🔧 Interactive mode: Let's set up your configuration\n");
        const interactiveArgs = await promptForMissingArgs(args);
        const result = config.schema.safeParse(interactiveArgs);

        if (!result.success) {
          throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
        }

        validatedArgs = result.data;
      } else {
        const result = config.schema.safeParse(args);

        if (!result.success) {
          throw ZodValidationError.fromZodError(result.error, "Invalid arguments");
        }

        validatedArgs = result.data;
      }

      // Execute the command handler
      await config.handler(validatedArgs);
    } catch (error: unknown) {
      cliConsole.error(error);
      process.exit(1);
    }
  });

  return command;
}
