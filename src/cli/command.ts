import { z } from "zod";
import { helpFormatter, type CliOption } from "./help-formatter";
import { Console, cliConsole } from "./console";

export const baseCommandArgsSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .describe("Saleor instance URL"),
  token: z
    .string({ required_error: "Token is required" })
    .describe("Saleor API token"),
  config: z.string().default("config.yml").describe("Configuration file path"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type BaseCommandArgs = z.infer<typeof baseCommandArgsSchema>;

type CliCommandDefinition<TSchema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  schema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<void>;
  examples?: string[];
};

export class CliCommand<TSchema extends z.ZodTypeAny> {
  name: string;
  description: string;
  schema: TSchema;
  handler: (args: z.infer<TSchema>) => Promise<void>;
  examples: string[];
  console: Console;

  constructor(
    definition: CliCommandDefinition<TSchema>,
    console: Console = cliConsole
  ) {
    this.name = definition.name;
    this.description = definition.description;
    this.schema = definition.schema;
    this.handler = definition.handler;
    this.examples = definition.examples || [];
    this.console = console;
  }

  parseArgs(input: string[]): z.infer<TSchema> {
    const parsedArgs: Record<string, string> = {};

    for (let i = 0; i < input.length; i++) {
      const arg = input[i];
      if (arg.startsWith("--")) {
        // Handle --key=value format
        if (arg.includes("=")) {
          const [key, ...valueParts] = arg.slice(2).split("=");
          const value = valueParts.join("="); // Rejoin in case value contains =
          parsedArgs[key] = value;
        } else {
          // Handle --key value format
          const key = arg.slice(2);
          const value = input[i + 1];
          if (value && !value.startsWith("--")) {
            parsedArgs[key] = value;
            i++; // Skip the value in next iteration
          }
        }
      }
    }

    return this.schema.parse(parsedArgs);
  }

  private getHelp(): string {
    const lines: string[] = [];

    // Usage line
    lines.push(`Usage: saleor-configurator ${this.name} [OPTIONS]`);
    lines.push("");

    // Description
    lines.push(`${this.description}`);
    lines.push("");

    // Options section
    lines.push("Options:");

    // Extract all options from schema (automatically handles union, intersection, etc.)
    const schemaOptions = helpFormatter.extractSchemaOptions(this.schema);

    // Deduplicate options by flag
    const uniqueOptions: CliOption[] = [];
    const seenFlags = new Set<string>();

    for (const option of schemaOptions) {
      if (!seenFlags.has(option.flag)) {
        uniqueOptions.push(option);
        seenFlags.add(option.flag);
      }
    }

    // Format options as help text
    const optionLines = helpFormatter.formatOptionsAsHelpText(uniqueOptions);
    lines.push(...optionLines);

    // Examples section
    if (this.examples.length > 0) {
      lines.push("");
      lines.push("Examples:");
      for (const example of this.examples) {
        lines.push(`  ${example}`);
      }
    }

    return lines.join("\n");
  }

  async run(argv: string[]) {
    try {
      // check if help flag is present
      if (argv.includes("--help") || argv.includes("-h")) {
        this.console.info(this.getHelp());
        process.exit(0);
      }

      const args = this.parseArgs(argv);
      await this.handler(args);
    } catch (error) {
      // You may want to improve error formatting here
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    }
  }
}
