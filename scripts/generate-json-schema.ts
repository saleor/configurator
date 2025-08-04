#!/usr/bin/env tsx

/**
 * JSON Schema Generator for Saleor Configurator
 *
 * This script generates a JSON Schema from the Zod configuration schema
 * using Zod v4's native JSON Schema support to enable IDE autocompletion
 * and validation for config.yml files.
 *
 * The generated schema can be used by:
 * - VSCode YAML extension for autocompletion
 * - Red Hat YAML extension
 * - Other JSON Schema-aware editors
 *
 * Usage: pnpm run generate-schema
 * Output: config.schema.json
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { configSchema } from "../src/modules/config/schema/schema.js";

function generateJsonSchema(): void {
  console.log("🔍 Converting Zod schema to JSON Schema using Zod v4 native support...");

  try {
    // Generate JSON Schema from Zod schema using the correct v4 API
    const jsonSchema = z.toJSONSchema(configSchema, {
      target: "draft-2020-12",
      unrepresentable: "any",
      cycles: "ref",
    });

    // Add schema metadata for better IDE integration
    const enhancedSchema = {
      ...jsonSchema,
      $id: "https://schemas.saleor.io/configurator/config.json",
      title: "Saleor Configurator Configuration",
      description: "JSON Schema for Saleor Configurator config.yml files",
      examples: [
        {
          shop: {
            defaultMailSenderName: "My Store",
            displayGrossPrices: true,
          },
          channels: [
            {
              name: "Default Channel",
              slug: "default",
              currencyCode: "USD",
              defaultCountry: "US",
              isActive: true,
            },
          ],
        },
      ],
    };

    // Write to file
    const outputPath = resolve(process.cwd(), "config.schema.json");
    writeFileSync(outputPath, JSON.stringify(enhancedSchema, null, 2));

    console.log(`✅ JSON Schema generated: ${outputPath}`);
    console.log("🎯 Schema can now be used for IDE autocompletion!");

    // Show some helpful information
    console.log("\n📝 To enable autocompletion in VSCode:");
    console.log("   1. Install the 'YAML' extension by Red Hat");
    console.log("   2. The .vscode/settings.json will be configured automatically");
    console.log("   3. Open your config.yml file and enjoy autocompletion!");
  } catch (error) {
    console.error("❌ Failed to generate JSON Schema:", error);
    process.exit(1);
  }
}

// Run the generator
generateJsonSchema();
