import { Command } from "@commander-js/extra-typings";
import { confirm, input, password, select } from "@inquirer/prompts";
import { z } from "zod";
import { ZodValidationError } from "../lib/errors/zod";
import { type Console, cliConsole } from "./console";
import { CliArgumentError } from "./errors";

export interface CommandHandler<T extends Record<string, unknown>, R> {
  console: Console;
  execute(args: T): Promise<R>;
}

/**
 * Validates and normalizes a Saleor URL
 */
function validateSaleorUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);

    // Auto-append /graphql/ if missing
    if (!parsedUrl.pathname.endsWith("/graphql/")) {
      if (parsedUrl.pathname.endsWith("/")) {
        parsedUrl.pathname += "graphql/";
      } else {
        parsedUrl.pathname += "/graphql/";
      }
    }

    return parsedUrl.toString();
  } catch {
    throw new CliArgumentError(
      `Invalid URL format: ${url}. Expected format: https://your-store.saleor.cloud/graphql/`
    );
  }
}

export const baseCommandArgsSchema = z.object({
  url: z.string().describe("Saleor instance URL").transform(validateSaleorUrl),
  token: z.string({ error: "Token is required" }).describe("Saleor API token"),
  config: z.string().default("config.yml").describe("Configuration file path"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type BaseCommandArgs = z.infer<typeof baseCommandArgsSchema>;

/**
 * Prompts for missing required arguments interactively
 */
export async function promptForMissingArgs(
  args: Partial<BaseCommandArgs>,
  requiredFields: Array<keyof BaseCommandArgs> = ["url", "token"]
): Promise<BaseCommandArgs> {
  const result = { ...args };

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

  // Set defaults for optional fields
  result.config = result.config || "config.yml";
  result.quiet = result.quiet || false;

  return baseCommandArgsSchema.parse(result);
}

/**
 * Prompts for confirmation with enhanced messaging
 */
export async function confirmAction(
  message: string,
  details?: string,
  defaultValue = false
): Promise<boolean> {
  if (details) {
    cliConsole.warn(`\n⚠️  ${details}\n`);
  }

  return confirm({
    message,
    default: defaultValue,
  });
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

export interface CommandConfig<T extends z.ZodObject<Record<string, z.ZodTypeAny>>> {
  name: string;
  description: string;
  schema: T;
  handler: (args: z.infer<T>) => Promise<void>;
  examples?: string[];
  requiresInteractive?: boolean;
}

function getOptionConfigFromZodForCommander(key: string, field: z.ZodTypeAny) {
  const isBoolean =
    field instanceof z.ZodBoolean ||
    (field instanceof z.ZodDefault && field._def.innerType instanceof z.ZodBoolean);

  return {
    flags: isBoolean ? `--${key}` : `--${key} <${key}>`,
    description: field.description || key,
    defaultValue: field instanceof z.ZodDefault 
      ? typeof field._def.defaultValue === 'function' 
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
    const { flags, description, defaultValue } = getOptionConfigFromZodForCommander(key, field);

    const isBoolean =
      field instanceof z.ZodBoolean ||
      (field instanceof z.ZodDefault && field._def.innerType instanceof z.ZodBoolean);

    if (isBoolean) {
      command.option(flags, description);
    } else {
      command.option(flags, description, defaultValue as string | undefined);
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
      help += `\n${cliConsole.important("Examples:")}\n`;
      for (const example of config.examples ?? []) {
        help += `${cliConsole.hint(`  ${example}`)}\n`;
      }
      return help;
    };
  }

  // Set action with interactive prompts and validation
  command.action(async (options: unknown, _command: unknown) => {
    try {
      // Handle interactive mode for missing arguments
      let validatedArgs: z.infer<T>;

      const args = options as Partial<z.infer<T>>;
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
