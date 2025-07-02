import { z } from "zod";
import { helpFormatter, type CliOption } from "./help-formatter";

const helpSchema = z.object({
  help: z.boolean().default(false),
});

const coreArgsSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .describe("Saleor instance URL"),
  token: z
    .string({ required_error: "Token is required" })
    .describe("Saleor API token"),
  config: z.string().default("config.yml").describe("Configuration file path"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export const baseCommandArgsSchema = z.union([helpSchema, coreArgsSchema]);

export type BaseCommandArgs = z.infer<typeof baseCommandArgsSchema>;
export const isHelp = (args: BaseCommandArgs) => "help" in args;

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

  constructor(definition: CliCommandDefinition<TSchema>) {
    this.name = definition.name;
    this.description = definition.description;
    this.schema = definition.schema;
    this.handler = definition.handler;
    this.examples = definition.examples || [
      `saleor-configurator ${definition.name} --url https://my-shop.saleor.cloud --token my-token`,
      `saleor-configurator ${definition.name} --url https://my-shop.saleor.cloud --token my-token --config my-config.yml`,
    ];
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

  async run(argv: string[]) {
    try {
      const args = this.parseArgs(argv);
      await this.handler(args);
    } catch (error) {
      // You may want to improve error formatting here
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    }
  }

  help(): string {
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
}
