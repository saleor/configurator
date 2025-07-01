import type z from "zod";
import { ConsoleOutput } from "./cli-console";

export interface CliCommandDefinition<T extends z.ZodRawShape> {
  description: string;
  schema: z.ZodObject<T>;
}

export class CliCommand<T extends CliCommandDefinition<z.ZodRawShape>> {
  console: ConsoleOutput;

  constructor(private readonly definition: T) {
    this.definition = definition;
    this.console = new ConsoleOutput({ quiet: false });
  }

  parseArgs(input: unknown) {
    return this.definition.schema.parse(input);
  }
}
