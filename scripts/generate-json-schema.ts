#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { z } from "zod";
import { getSupportedSaleorMinor } from "../src/lib/package-info.js";
import { configSchema } from "../src/modules/config/schema/schema.js";

interface JsonSchemaObject {
  description?: string;
  not?: unknown;
  properties?: Record<string, JsonSchemaObject>;
  items?: JsonSchemaObject;
  anyOf?: JsonSchemaObject[];
  oneOf?: JsonSchemaObject[];
  allOf?: JsonSchemaObject[];
  $defs?: Record<string, JsonSchemaObject>;
}

function isRemovedFieldDiagnostic(property: JsonSchemaObject): boolean {
  return property.description?.startsWith("Removed in Saleor ") === true && "not" in property;
}

function stripRemovedFieldDiagnostics(schema: JsonSchemaObject): void {
  if (schema.properties) {
    for (const [name, property] of Object.entries(schema.properties)) {
      if (isRemovedFieldDiagnostic(property)) {
        delete schema.properties[name];
        continue;
      }

      stripRemovedFieldDiagnostics(property);
    }
  }

  if (schema.items) stripRemovedFieldDiagnostics(schema.items);
  schema.anyOf?.forEach(stripRemovedFieldDiagnostics);
  schema.oneOf?.forEach(stripRemovedFieldDiagnostics);
  schema.allOf?.forEach(stripRemovedFieldDiagnostics);

  if (schema.$defs) {
    Object.values(schema.$defs).forEach(stripRemovedFieldDiagnostics);
  }
}

/**
 * Generate JSON Schema from Zod schema for documentation purposes
 */
function generateJsonSchema(): void {
  console.log("🔄 Generating JSON Schema from Zod configuration schema...");

  try {
    // Convert Zod schema to JSON Schema using Zod v4's native toJSONSchema
    const jsonSchema = z.toJSONSchema(configSchema) as JsonSchemaObject;
    stripRemovedFieldDiagnostics(jsonSchema);

    // Add additional metadata for documentation
    const documentationSchema = {
      ...jsonSchema,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Saleor Configurator Configuration Schema",
      description: `Schema for Saleor Configurator YAML configuration files targeting Saleor ${getSupportedSaleorMinor()}.x. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.`,
      examples: [
        {
          shop: {
            headerText: "My Store",
            description: "E-commerce store powered by Saleor",
            trackInventoryByDefault: true,
            defaultWeightUnit: "KG",
          },
          channels: [
            {
              name: "Default Channel",
              currencyCode: "USD",
              defaultCountry: "US",
              slug: "default-channel",
              isActive: true,
            },
          ],
          productTypes: [
            {
              name: "Book",
              isShippingRequired: false,
              productAttributes: [
                {
                  name: "Author",
                  inputType: "PLAIN_TEXT",
                },
              ],
            },
          ],
        },
      ],
    };

    // Write to file
    const outputPath = "schema.json";
    writeFileSync(outputPath, JSON.stringify(documentationSchema, null, 2), "utf8");

    console.log(`✅ JSON Schema generated successfully: ${outputPath}`);
    console.log(
      `📊 Schema includes ${Object.keys(documentationSchema.properties || {}).length} top-level properties`
    );
    console.log(
      `🔗 Schema definitions: ${Object.keys(documentationSchema.$defs || {}).length} nested schemas`
    );
  } catch (error) {
    console.error("❌ Failed to generate JSON Schema:", error);
    process.exit(1);
  }
}

generateJsonSchema();
