#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { z } from "zod";
import { configSchema } from "../src/modules/config/schema/schema.js";

/**
 * Generate JSON Schema from Zod schema for documentation purposes
 */
function generateJsonSchema(): void {
  console.log("🔄 Generating JSON Schema from Zod configuration schema...");

  try {
    // Convert Zod schema to JSON Schema using Zod v4's native toJSONSchema
    const jsonSchema = z.toJSONSchema(configSchema);

    // Add additional metadata for documentation
    const documentationSchema = {
      ...jsonSchema,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      title: "Saleor Configurator Configuration Schema",
      description:
        "Schema for Saleor Configurator YAML configuration files. This defines all available fields, their types, and validation rules for managing Saleor e-commerce store configuration as code.",
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
