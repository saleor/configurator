import { writeFileSync } from "node:fs";
import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { COMMAND_NAME } from "../meta";
import { configSchema } from "../modules/config/schema/schema";

export const schemaCommandSchema = z.object({
  output: z.string().optional().describe("Write schema to file instead of stdout"),
});

export type SchemaCommandArgs = z.infer<typeof schemaCommandSchema>;

function buildDocumentationSchema(): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(configSchema);

  return {
    ...jsonSchema,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Saleor Configurator Configuration Schema",
    description:
      "Schema for Saleor Configurator YAML configuration files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.",
  };
}

export function schemaHandler(args: SchemaCommandArgs): void {
  const { output } = args;
  const documentationSchema = buildDocumentationSchema();
  const json = JSON.stringify(documentationSchema, null, 2);

  if (output) {
    writeFileSync(output, json, "utf8");
    console.error(`JSON Schema written to ${output}`);
    return;
  }

  console.log(json);
}

export const schemaCommandConfig: CommandConfig<typeof schemaCommandSchema> = {
  name: "schema",
  description:
    "Output the JSON Schema for config.yml (for IDE autocompletion and agent validation)",
  schema: schemaCommandSchema,
  handler: schemaHandler,
  requiresInteractive: false,
  examples: [`${COMMAND_NAME} schema`, `${COMMAND_NAME} schema --output schema.json`],
};
