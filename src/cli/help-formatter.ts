import type z from "zod";

export type CliOption = {
  flag: string;
  description: string;
  required: boolean;
  default?: any;
};

/**
 * Extracts all options from a Zod schema, including union and intersection types
 */
function extractSchemaOptions(schema: z.ZodTypeAny): CliOption[] {
  const options: CliOption[] = [];
  const schemaAny = schema as any;

  // Handle intersection types (baseCommandArgsSchema.and(...))
  if (schemaAny._def?.typeName === "ZodIntersection") {
    const leftSchema = schemaAny._def.left;
    const rightSchema = schemaAny._def.right;

    // Extract from left side (usually baseCommandArgsSchema)
    options.push(...extractSchemaOptions(leftSchema));

    // Extract from right side (additional schema)
    if (rightSchema?.shape) {
      for (const [key, field] of Object.entries(rightSchema.shape)) {
        const option = parseZodField(key, field as any);
        if (option) {
          options.push(option);
        }
      }
    }
  }

  // Handle union types (like baseCommandArgsSchema which is union of helpSchema and coreArgsSchema)
  else if (schemaAny._def?.typeName === "ZodUnion") {
    const unionOptions = schemaAny._def.options;
    for (const unionOption of unionOptions) {
      options.push(...extractSchemaOptions(unionOption));
    }
  }

  // Handle direct object schema
  else if (schemaAny.shape) {
    for (const [key, field] of Object.entries(schemaAny.shape)) {
      const option = parseZodField(key, field as any);
      if (option) {
        options.push(option);
      }
    }
  }

  return options;
}
/**
 * Parses a Zod field to extract CLI option information
 */
function parseZodField(key: string, fieldAny: any): CliOption | null {
  let description = `${key} value`;
  let required = false;
  let defaultValue: any = undefined;

  // Handle different Zod types
  if (fieldAny._def?.typeName === "ZodString") {
    description = fieldAny._def.description || `${key} value`;
    required = !fieldAny.isOptional?.();
    defaultValue = fieldAny._def.defaultValue;
  } else if (fieldAny._def?.typeName === "ZodBoolean") {
    description = fieldAny._def.description || `${key} flag`;
    required = false;
    defaultValue = fieldAny._def.defaultValue;
  } else if (fieldAny._def?.typeName === "ZodDefault") {
    const innerType = fieldAny._def.innerType;
    // Get description from the default wrapper first, then inner type
    description = fieldAny._def.description || innerType?._def?.description;

    if (!description) {
      if (innerType?._def?.typeName === "ZodString") {
        description = `${key} value`;
      } else if (innerType?._def?.typeName === "ZodBoolean") {
        description = `${key} flag`;
      }
    }

    required = false;
    try {
      defaultValue =
        typeof fieldAny._def.defaultValue === "function"
          ? fieldAny._def.defaultValue()
          : fieldAny._def.defaultValue;
    } catch {
      defaultValue = undefined;
    }
  }

  // Handle help field specially
  else if (key === "help") {
    description = "Show this help message";
    required = false;
    defaultValue = false;
  } else {
    // Unknown type, skip
    return null;
  }

  return {
    flag: `--${key}`,
    description,
    required,
    default: defaultValue,
  };
}
/**
 * Formats CLI options into help text lines
 */
function formatOptionsAsHelpText(options: CliOption[]): string[] {
  const lines: string[] = [];

  if (options.length === 0) {
    return lines;
  }

  const maxFlagLength = Math.max(...options.map((opt) => opt.flag.length));

  for (const option of options) {
    const flag = option.flag.padEnd(maxFlagLength + 2);
    let line = `  ${flag}${option.description}`;

    if (option.required) {
      line += " (required)";
    } else if (option.default !== undefined) {
      line += ` (default: ${option.default})`;
    }

    lines.push(line);
  }

  return lines;
}

export const helpFormatter = {
  extractSchemaOptions,
  formatOptionsAsHelpText,
};
