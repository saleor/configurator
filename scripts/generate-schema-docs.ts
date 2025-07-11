#!/usr/bin/env tsx

/**
 * Automated Schema Documentation Generator
 *
 * This script automatically generates comprehensive documentation from Zod schemas.
 * It introspects the Zod schema definitions and creates a structured Markdown file
 * documenting all configuration options with their types, requirements, and GraphQL mappings.
 *
 * How it works:
 * 1. Analyzes the main configSchema using Zod's internal structure
 * 2. Recursively walks through nested objects, arrays, unions, enums, and records
 * 3. Extracts descriptions from schema.describe() calls
 * 4. Identifies field types (string, number, boolean, enum, object, array, etc.)
 * 5. Determines if fields are optional or required
 * 6. Extracts enum values and type unions
 * 7. Generates structured Markdown with proper heading hierarchy
 *
 * Key features:
 * - Automatically extracts GraphQL field mappings from descriptions
 * - Lists enum values for developer reference
 * - Shows required vs optional fields
 * - Handles complex nested structures
 * - Maintains proper Markdown formatting
 * - Always stays in sync with schema changes
 *
 * Usage: pnpm run generate-docs
 * Output: SCHEMA.md (auto-generated, gitignored)
 */

import { writeFileSync } from "node:fs";
import { z } from "zod";
import { configSchema } from "../src/modules/config/schema/schema.js";

interface SchemaDocumentation {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
  enum?: string[];
  properties?: SchemaDocumentation[];
  example?: unknown;
}

function analyzeZodSchema(schema: z.ZodTypeAny, name: string = "root"): SchemaDocumentation {
  const doc: SchemaDocumentation = {
    name,
    type: "unknown",
    optional: false,
  };

  // Extract description from Zod schema
  if (
    schema &&
    "_def" in schema &&
    typeof schema._def === "object" &&
    schema._def &&
    "description" in schema._def
  ) {
    doc.description = String(schema._def.description);
  }

  // Handle optional schemas
  if (schema instanceof z.ZodOptional) {
    doc.optional = true;
    const unwrapped = analyzeZodSchema(schema.unwrap(), name);
    return {
      ...unwrapped,
      optional: true,
      description: unwrapped.description || doc.description,
    };
  }

  // Handle arrays
  if (schema instanceof z.ZodArray) {
    const element = analyzeZodSchema(schema.element, "item");
    return {
      ...doc,
      type: `${element.type}[]`,
      properties: element.properties,
    };
  }

  // Handle objects
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    doc.type = "object";
    doc.properties = Object.entries(shape).map(([key, value]) =>
      analyzeZodSchema(value as z.ZodTypeAny, key)
    );
    return doc;
  }

  // Handle enums
  if (schema instanceof z.ZodEnum) {
    doc.type = "enum";
    doc.enum = schema.options;
    return doc;
  }

  // Handle unions (like z.union([z.string(), z.array(z.string())]))
  if (schema instanceof z.ZodUnion) {
    const types = schema.options.map((option: z.ZodTypeAny) => {
      const analyzed = analyzeZodSchema(option, name);
      return analyzed.type;
    });
    doc.type = types.join(" | ");
    return doc;
  }

  // Handle records (like z.record(z.string()))
  if (schema instanceof z.ZodRecord) {
    const valueType =
      "_def" in schema &&
      typeof schema._def === "object" &&
      schema._def &&
      "valueType" in schema._def
        ? analyzeZodSchema(schema._def.valueType as z.ZodTypeAny, "value")
        : { type: "unknown" };
    doc.type = `Record<string, ${valueType.type}>`;
    return doc;
  }

  // Handle discriminated unions and intersections
  if (schema instanceof z.ZodDiscriminatedUnion) {
    doc.type = "object";
    return doc;
  }

  if (schema instanceof z.ZodIntersection) {
    const left = analyzeZodSchema(schema._def.left, name);
    const right = analyzeZodSchema(schema._def.right, name);
    doc.type = `${left.type} & ${right.type}`;
    return doc;
  }

  // Handle basic types
  if (schema instanceof z.ZodString) {
    doc.type = "string";
  } else if (schema instanceof z.ZodNumber) {
    doc.type = "number";
  } else if (schema instanceof z.ZodBoolean) {
    doc.type = "boolean";
  } else if (schema instanceof z.ZodLazy) {
    doc.type = "recursive";
  }

  return doc;
}

function generateMarkdownDocs(schema: SchemaDocumentation, level: number = 1): string {
  // Skip root level "Configuration" wrapper
  if (level === 1 && schema.name === "Configuration") {
    let markdown = "";
    if (schema.properties && schema.properties.length > 0) {
      for (const prop of schema.properties) {
        markdown += generateMarkdownDocs(prop, level);
      }
    }
    return markdown;
  }

  const header = "#".repeat(Math.min(level + 1, 6));
  let markdown = `${header} ${schema.name}\n\n`;

  // Add GraphQL field reference
  if (
    schema.description &&
    !enhancedDescriptions[schema.name as keyof typeof enhancedDescriptions]
  ) {
    markdown += `**GraphQL Field**: \`${schema.description}\`\n\n`;
  }

  // Create a compact info table for primitive types
  if (!schema.properties || schema.properties.length === 0) {
    markdown += "| Property | Value |\n";
    markdown += "|---|---|\n";
    markdown += `| **Type** | \`${schema.type}\` |\n`;
    markdown += `| **Required** | ${schema.optional ? "No" : "Yes"} |\n`;

    if (schema.enum) {
      markdown += `| **Values** | ${schema.enum.map((v) => `\`${v}\``).join(", ")} |\n`;
    }

    if (schema.example !== undefined) {
      markdown += `| **Example** | \`${JSON.stringify(schema.example)}\` |\n`;
    }

    markdown += "\n";
  } else {
    // For objects with properties, show type info inline
    markdown += `**Type**: \`${schema.type}\` ${schema.optional ? "(optional)" : "(required)"}\n\n`;

    if (
      schema.description &&
      enhancedDescriptions[schema.name as keyof typeof enhancedDescriptions]
    ) {
      markdown += `${schema.description}\n\n`;
    }
  }

  // Add properties with proper nesting
  if (schema.properties && schema.properties.length > 0) {
    for (const prop of schema.properties) {
      markdown += generateMarkdownDocs(prop, level + 1);
    }
  }

  return markdown;
}

// Add descriptions and examples to make documentation richer
const enhancedDescriptions = {
  shop: "Global shop settings that apply to the entire Saleor instance",
  channels: "Sales channels for different markets, regions, or customer segments",
  productTypes: "Product type definitions with their associated attributes",
  pageTypes: "Page type definitions for CMS content",
  categories: "Product category hierarchy",
  products: "Product catalog with variants and attributes",
};

function addDescriptions(doc: SchemaDocumentation): SchemaDocumentation {
  // Only add enhanced descriptions for top-level sections
  if (enhancedDescriptions[doc.name as keyof typeof enhancedDescriptions]) {
    doc.description = enhancedDescriptions[doc.name as keyof typeof enhancedDescriptions];
  }

  // Recursively process properties
  if (doc.properties) {
    doc.properties.forEach((prop) => {
      addDescriptions(prop);

      // Add examples for specific fields
      switch (prop.name) {
        case "attributes":
          prop.example = { Color: "Red", Size: ["S", "M", "L"] };
          break;
      }
    });
  }

  return doc;
}

function generateTableOfContents(schema: SchemaDocumentation): string {
  let toc = "## Table of Contents\n\n";

  if (schema.properties) {
    for (const prop of schema.properties) {
      toc += `- [${prop.name}](#${prop.name.toLowerCase()})\n`;
    }
  }

  return `${toc}\n`;
}

// Generate documentation
console.log("🔍 Analyzing Zod schema...");
const rawDocs = analyzeZodSchema(configSchema, "Configuration");
const enhancedDocs = addDescriptions(rawDocs);

console.log("📝 Generating Markdown documentation...");
const markdown = `# 📋 Configuration Schema Reference

> **Automated documentation for Saleor Configurator**
> 
> This document describes all available configuration options with their GraphQL field mappings.

${generateTableOfContents(enhancedDocs)}

${generateMarkdownDocs(enhancedDocs)}
`;

// Write to file
const outputPath = "SCHEMA.md";
writeFileSync(outputPath, markdown);

console.log(`✅ Documentation generated: ${outputPath}`);
