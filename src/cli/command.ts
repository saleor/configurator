import { z } from "zod";

export type CliCommandDefinition<TSchema extends z.ZodRawShape> = {
  name: string;
  description: string;
  schema: z.ZodObject<TSchema>;
};

// is this really needed?
export class CliCommand<T extends CliCommandDefinition<z.ZodRawShape>> {
  schema: T["schema"];

  constructor(definition: T) {
    this.schema = definition.schema;
  }

  parseArgs(input: string[]): z.infer<T["schema"]> {
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
}
