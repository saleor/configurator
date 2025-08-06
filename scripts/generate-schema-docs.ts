#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs";

interface JsonSchemaProperty {
  type?: string | string[];
  description?: string;
  enum?: string[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  default?: any;
  anyOf?: JsonSchemaProperty[];
  $ref?: string;
}

interface JsonSchema {
  title: string;
  description: string;
  properties: Record<string, JsonSchemaProperty>;
  $defs?: Record<string, JsonSchemaProperty>;
}

/**
 * Generate user-friendly SCHEMA.md documentation from JSON Schema
 */
function generateSchemaDocs(): void {
  console.log("🔄 Generating SCHEMA.md from JSON Schema...");

  try {
    // Read the generated JSON schema
    const schemaPath = "schema.json";
    const schemaContent = readFileSync(schemaPath, "utf8");
    const schema: JsonSchema = JSON.parse(schemaContent);

    const markdown = generateMarkdownFromSchema(schema);

    // Write to SCHEMA.md
    const outputPath = "SCHEMA.md";
    writeFileSync(outputPath, markdown, "utf8");

    console.log(`✅ Schema documentation generated successfully: ${outputPath}`);
    console.log(`📄 Generated ${markdown.split("\n").length} lines of documentation`);
  } catch (error) {
    console.error("❌ Failed to generate schema documentation:", error);
    process.exit(1);
  }
}

function generateMarkdownFromSchema(schema: JsonSchema): string {
  let markdown = `# ${schema.title}\n\n`;
  markdown += `${schema.description}\n\n`;
  markdown += `> [!TIP]\n`;
  markdown += `> For a complete configuration example, see [example.yml](example.yml).\n\n`;

  markdown += "## Table of Contents\n\n";
  for (const [key] of Object.entries(schema.properties)) {
    markdown += `- [${key}](#${key.toLowerCase()})\n`;
  }
  markdown += "\n";

  // Generate documentation for each top-level property
  for (const [propertyName, property] of Object.entries(schema.properties)) {
    markdown += generatePropertySection(propertyName, property, schema, 2);
  }


  return markdown;
}

function getFriendlyDescription(originalDescription?: string): string {
  return originalDescription || "No description available";
}

function generatePropertySection(
  name: string,
  property: JsonSchemaProperty,
  schema: JsonSchema,
  level: number = 2
): string {
  let markdown = "";
  const headerPrefix = "#".repeat(level);

  // Handle property name and type
  const typeInfo = getTypeInfo(property, schema);
  markdown += `${headerPrefix} ${name}\n\n`;

  // Add description from schema
  if (property.description) {
    markdown += `${property.description}\n\n`;
  }

  markdown += `**Type:** \`${typeInfo.type}\`${typeInfo.required ? " *(required)*" : " *(optional)*"}\n\n`;

  if (typeInfo.defaultValue !== undefined) {
    markdown += `**Default:** \`${JSON.stringify(typeInfo.defaultValue)}\`\n\n`;
  }

  // Handle enums with better formatting
  if (property.enum) {
    markdown += "**Allowed values:**\n";
    if (property.enum.length <= 10) {
      // Show inline for small enums
      markdown += `\`${property.enum.join('` | `')}\`\n\n`;
    } else {
      // Show as list for large enums
      const chunks = [];
      for (let i = 0; i < property.enum.length; i += 6) {
        chunks.push(property.enum.slice(i, i + 6).map(v => `\`${v}\``).join(', '));
      }
      for (const chunk of chunks) {
        markdown += `${chunk}${chunks.indexOf(chunk) < chunks.length - 1 ? ',' : ''}\n`;
      }
      markdown += "\n";
    }
  }

  // Handle object properties
  if (property.type === "object" && property.properties) {
    markdown += "**Properties:**\n\n";
    for (const [propName, prop] of Object.entries(property.properties)) {
      const propType = getTypeInfo(prop, schema);
      const isRequired = property.required?.includes(propName);
      const friendlyDescription = getFriendlyDescription(prop.description);
      markdown += `- **${propName}** (\`${propType.type}\`)${isRequired ? " *required*" : ""}: ${friendlyDescription}\n`;
    }
    markdown += "\n";
  }

  // Handle arrays
  if (property.type === "array" && property.items) {
    markdown += "**Array items:**\n\n";
    const itemType = getTypeInfo(property.items, schema);
    markdown += `Each item is of type: \`${itemType.type}\`\n\n`;

    // Extract properties from array items, handling union types
    const itemProperties = extractPropertiesFromItem(property.items, schema);
    if (itemProperties.length > 0) {
      markdown += "**Item properties:**\n\n";
      for (const { name: propName, property: prop, required } of itemProperties) {
        const propType = getTypeInfo(prop, schema);
        const friendlyDescription = getFriendlyDescription(prop.description);
        markdown += `- **${propName}** (\`${propType.type}\`)${required ? " *required*" : ""}: ${friendlyDescription}\n`;
        
        // Show enum values for array item properties
        if (prop.enum) {
          markdown += `  - **Allowed values:** `;
          if (prop.enum.length <= 8) {
            markdown += `\`${prop.enum.join('` | `')}\`\n`;
          } else {
            markdown += `\n`;
            const chunks = [];
            for (let i = 0; i < prop.enum.length; i += 6) {
              chunks.push(prop.enum.slice(i, i + 6).map(v => `\`${v}\``).join(', '));
            }
            for (const chunk of chunks) {
              markdown += `    ${chunk}${chunks.indexOf(chunk) < chunks.length - 1 ? ',' : ''}\n`;
            }
          }
        }
      }
      markdown += "\n";
    }
  }

  // Add usage example
  markdown += generateUsageExample(name, property);

  return markdown;
}

function extractPropertiesFromItem(
  item: JsonSchemaProperty,
  schema: JsonSchema
): Array<{ name: string; property: JsonSchemaProperty; required: boolean }> {
  const properties: Array<{ name: string; property: JsonSchemaProperty; required: boolean }> = [];

  // Direct properties
  if (item.properties) {
    for (const [name, prop] of Object.entries(item.properties)) {
      properties.push({
        name,
        property: prop,
        required: item.required?.includes(name) || false,
      });
    }
  }

  // Handle anyOf (union types)
  if (item.anyOf) {
    const propertyMap = new Map<string, { property: JsonSchemaProperty; required: boolean }>();
    
    for (const variant of item.anyOf) {
      const variantProps = extractPropertiesFromItem(variant, schema);
      for (const { name, property, required } of variantProps) {
        // Merge properties from different union variants
        // If a property exists in multiple variants, combine their info
        if (propertyMap.has(name)) {
          const existing = propertyMap.get(name)!;
          // Keep the more detailed property definition
          if (property.description && !existing.property.description) {
            propertyMap.set(name, { property, required: existing.required || required });
          } else {
            propertyMap.set(name, { property: existing.property, required: existing.required || required });
          }
        } else {
          propertyMap.set(name, { property, required });
        }
      }
    }
    
    for (const [name, { property, required }] of propertyMap) {
      properties.push({ name, property, required });
    }
  }

  // Handle references
  if (item.$ref) {
    const refKey = item.$ref.split("/").pop();
    if (refKey && schema.$defs?.[refKey]) {
      return extractPropertiesFromItem(schema.$defs[refKey], schema);
    }
  }

  return properties;
}

function getTypeInfo(
  property: JsonSchemaProperty,
  schema: JsonSchema
): {
  type: string;
  required: boolean;
  defaultValue?: any;
} {
  if (property.$ref) {
    // Handle reference to definition
    const refKey = property.$ref.split("/").pop();
    if (refKey && schema.$defs?.[refKey]) {
      return getTypeInfo(schema.$defs[refKey], schema);
    }
  }

  if (property.anyOf) {
    // Special handling for attribute types
    if (isAttributeType(property)) {
      return {
        type: "AttributeInput",
        required: false,
        defaultValue: property.default,
      };
    }
    
    const types = property.anyOf.map((p) => getTypeInfo(p, schema).type);
    // Deduplicate identical types (like "object | object")
    const uniqueTypes = [...new Set(types)];
    return {
      type: uniqueTypes.join(" | "),
      required: false,
      defaultValue: property.default,
    };
  }

  if (Array.isArray(property.type)) {
    return {
      type: property.type.join(" | "),
      required: false,
      defaultValue: property.default,
    };
  }

  let type = property.type || "unknown";

  if (property.enum) {
    type += ` (enum)`;
  }

  if (property.type === "array" && property.items) {
    const itemType = getTypeInfo(property.items, schema);
    type = `array<${itemType.type}>`;
  }

  return {
    type,
    required: false, // This would need to be passed from parent context
    defaultValue: property.default,
  };
}

function isAttributeType(property: JsonSchemaProperty): boolean {
  // Check if this is an attribute union type by looking for attribute patterns
  if (!property.anyOf) return false;
  
  // Look for the attribute reference pattern: { attribute: string }
  const hasAttributeReference = property.anyOf.some(variant => 
    variant.properties?.attribute?.type === "string"
  );
  
  // Look for attribute definition patterns with inputType
  const hasAttributeDefinition = property.anyOf.some(variant => {
    if (variant.anyOf) {
      return variant.anyOf.some(subVariant => 
        subVariant.properties?.inputType?.type === "string"
      );
    }
    return variant.properties?.inputType?.type === "string";
  });
  
  return hasAttributeReference || hasAttributeDefinition;
}

function generateUsageExample(name: string, property: JsonSchemaProperty): string {
  return "";
}

generateSchemaDocs();
