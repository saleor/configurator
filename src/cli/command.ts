import { z } from "zod";

type CliCommandDefinition<TSchema extends z.ZodRawShape> = {
  name: string;
  description: string;
  schema: z.ZodObject<TSchema>;
  handler: (args: z.infer<z.ZodObject<TSchema>>) => Promise<void>;
};

export class CliCommand<TSchema extends z.ZodRawShape> {
  name: string;
  description: string;
  schema: z.ZodObject<TSchema>;
  handler: (args: z.infer<z.ZodObject<TSchema>>) => Promise<void>;

  constructor(definition: CliCommandDefinition<TSchema>) {
    this.name = definition.name;
    this.description = definition.description;
    this.schema = definition.schema;
    this.handler = definition.handler;
  }

  parseArgs(input: string[]): z.infer<z.ZodObject<TSchema>> {
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
}
