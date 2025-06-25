import { z } from "zod";

export interface CliError extends Error {
  readonly isCliError: true;
  readonly helpText?: string;
}

export interface ParsedArgs {
  readonly [key: string]: string | boolean | undefined;
}

export interface EnvironmentVariables {
  readonly SALEOR_URL?: string;
  readonly SALEOR_TOKEN?: string;
  readonly SALEOR_CONFIG?: string;
}

export interface HelpDisplayOptions {
  readonly commandName: string;
  readonly schema: z.ZodObject<z.ZodRawShape>;
}

export interface ArgumentParsingOptions {
  readonly argv: readonly string[];
  readonly env: EnvironmentVariables;
}

/**
 * Common CLI argument definitions shared across commands
 */
export const commonArgs = {
  url: z
    .string({ required_error: "Saleor GraphQL URL is required" })
    .describe("Saleor GraphQL endpoint URL"),
  token: z
    .string({ required_error: "Saleor authentication token is required" })
    .describe("Saleor authentication token (staff user with proper permissions)"),
  config: z
    .string()
    .default("config.yml")
    .describe("Path to configuration file"),
  quiet: z
    .boolean()
    .default(false)
    .describe("Suppress progress messages"),
  verbose: z
    .boolean()
    .default(false)
    .describe("Show detailed debug information"),
} as const;

/**
 * Diff command specific arguments
 */
export const diffOnlyArgs = {
  format: z
    .enum(["table", "json", "summary"])
    .default("table")
    .describe("Output format (table, json, summary)"),
  filter: z
    .string()
    .optional()
    .describe("Filter by entity types (comma-separated: channels,shop,producttypes,pagetypes,categories)"),
} as const;

/**
 * Pre-defined command schemas for type safety and reusability
 */
export const commandSchemas = {
  push: z.object(commonArgs),
  pull: z.object(commonArgs),
  diff: z.object({ ...commonArgs, ...diffOnlyArgs }),
} as const;

// Derive command names from schema keys for type safety
export type CommandName = keyof typeof commandSchemas;

/**
 * Factory function to create CLI-specific errors
 * @param message - Error message
 * @param helpText - Optional help text to display
 * @returns Properly typed CLI error
 */
export const createCliError = (message: string, helpText?: string): CliError => {
  const error = new Error(message) as CliError;
  Object.defineProperty(error, 'isCliError', { value: true, writable: false });
  if (helpText) {
    Object.defineProperty(error, 'helpText', { value: helpText, writable: false });
  }
  return error;
};

/**
 * Extract all field descriptions from a Zod object schema
 */
export function extractSchemaDescriptions<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): Record<string, string> {
  const descriptions: Record<string, string> = {};
  const shape = schema.shape;

  Object.entries(shape).forEach(([key, fieldSchema]) => {
    const description = extractFieldDescription(fieldSchema as z.ZodTypeAny);
    if (description) {
      descriptions[key] = description;
    }
  });

  return descriptions;
}

/**
 * Extract description from a single field schema, handling nested types
 */
function extractFieldDescription(fieldSchema: z.ZodTypeAny): string | undefined {
  let currentSchema = fieldSchema;
  
  // Check current level first
  let description = getDirectDescription(currentSchema);
  if (description) return description;

  // Unwrap nested schemas (Optional, Default, etc.)
  const maxDepth = 5; // Prevent infinite loops
  let depth = 0;
  
  while (
    !description && 
    depth < maxDepth && 
    (currentSchema instanceof z.ZodOptional || currentSchema instanceof z.ZodDefault)
  ) {
    currentSchema = currentSchema instanceof z.ZodOptional 
      ? currentSchema.unwrap()
      : currentSchema._def.innerType;
    
    description = getDirectDescription(currentSchema);
    depth++;
  }

  return description;
}

/**
 * Get description directly from schema _def
 */
function getDirectDescription(schema: z.ZodTypeAny): string | undefined {
  return (schema as any)._def?.description;
}
/**
 * Parse command line arguments into a structured object
 */
export function parseRawArguments(argv: readonly string[]): ParsedArgs {
  const parsedArgs: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (!arg.startsWith("--")) continue;

    const { key, value, skipNext } = parseArgument(arg, argv[i + 1]);
    parsedArgs[key] = value;
    
    if (skipNext) i++; // Skip the next argument if it was consumed as a value
  }

  return parsedArgs;
}

/**
 * Parse a single argument and its potential value
 */
function parseArgument(
  arg: string, 
  nextArg?: string
): { key: string; value: string | boolean; skipNext: boolean } {
  // Handle --key=value format
  if (arg.includes("=")) {
    const [key, ...valueParts] = arg.slice(2).split("=");
    return { 
      key, 
      value: valueParts.join("="), // Rejoin in case value contains =
      skipNext: false 
    };
  }

  // Handle --key value format
  const key = arg.slice(2);
  if (nextArg && !nextArg.startsWith("--")) {
    return { key, value: nextArg, skipNext: true };
  }

  // Boolean flag
  return { key, value: true, skipNext: false };
}

/**
 * Extract relevant environment variables
 */
export function extractEnvironmentDefaults(env: NodeJS.ProcessEnv = process.env): EnvironmentVariables {
  return {
    SALEOR_URL: env.SALEOR_URL,
    SALEOR_TOKEN: env.SALEOR_TOKEN,
    SALEOR_CONFIG: env.SALEOR_CONFIG,
  };
}

const ENVIRONMENT_PREFIX = "SALEOR_";

/**
 * Display comprehensive help for a command
 */
export function displayHelp({ commandName, schema }: HelpDisplayOptions): void {
  const sections = generateHelpSections(commandName, schema);
  
  console.log(`\n📖 ${commandName.toUpperCase()} Command Help\n`);
  
  sections.forEach(section => {
    console.log(section);
  });
}

/**
 * Generate help sections for better organization
 */
function generateHelpSections(
  commandName: string, 
  schema: z.ZodObject<z.ZodRawShape>
): string[] {
  const { required, optional } = categorizeArguments(schema);
  const descriptions = extractSchemaDescriptions(schema);
  
  const sections: string[] = [];

  // Required arguments section
  if (required.length > 0) {
    sections.push(formatArgumentSection("🔴 Required Arguments:", required, descriptions, true));
  }

  // Optional arguments section
  if (optional.length > 0) {
    sections.push(formatArgumentSection("🟡 Optional Arguments:", optional, descriptions, false));
  }

  // Examples section
  sections.push(generateExamplesSection(commandName));

  // Tips section
  sections.push(generateTipsSection());

  return sections;
}

/**
 * Categorize arguments into required and optional
 */
function categorizeArguments(schema: z.ZodObject<z.ZodRawShape>) {
  const required: string[] = [];
  const optional: string[] = [];
  
  Object.entries(schema.shape).forEach(([key, fieldSchema]) => {
    if (fieldSchema instanceof z.ZodDefault || fieldSchema instanceof z.ZodOptional) {
      optional.push(key);
    } else {
      required.push(key);
    }
  });

  return { required, optional };
}

/**
 * Format a section of arguments (required or optional)
 */
function formatArgumentSection(
  title: string,
  args: string[],
  descriptions: Record<string, string>,
  showEnvVars: boolean
): string {
  const lines = [title];
  
  args.forEach(arg => {
    lines.push(`  --${arg} <value>`);
    
    const description = descriptions[arg];
    if (description) {
      lines.push(`      ${description}`);
    }
    
    if (showEnvVars) {
      const envVar = `${ENVIRONMENT_PREFIX}${arg.toUpperCase()}`;
      lines.push(`      Environment: ${envVar}`);
    }
    
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Generate examples section
 */
function generateExamplesSection(commandName: string): string {
  const examples = [
    "📝 Examples:",
    "  # Using command line arguments",
    `  npm run ${commandName} -- --url https://demo.saleor.io/graphql/ --token your-token`,
    "",
    "  # Using environment variables",
    `  SALEOR_URL=https://demo.saleor.io/graphql/ SALEOR_TOKEN=your-token npm run ${commandName}`,
    "",
  ];

  // Add command-specific examples
  if (commandName === "diff") {
    examples.push(
      "  # Diff-specific examples",
      "  npm run diff -- --url ... --token ... --format summary",
      "  npm run diff -- --url ... --token ... --filter channels,shop --quiet",
      ""
    );
  }

  return examples.join("\n");
}

/**
 * Generate tips section
 */
function generateTipsSection(): string {
  return [
    "💡 Tips:",
    "  • Create a .env file with your credentials (see .env.example)",
    "  • Use --quiet for CI/CD environments",
    "  • Use --verbose for debugging issues",
    "",
  ].join("\n");
}

/**
 * Main CLI argument parsing function with improved error handling and separation of concerns
 */
export function parseCliArgs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  commandName: string = "command",
  options: Partial<ArgumentParsingOptions> = {}
): z.infer<z.ZodObject<T>> {
  const argv = options.argv ?? process.argv.slice(2);
  const env = options.env ?? extractEnvironmentDefaults();

  // Handle help request early
  if (argv.includes("--help") || argv.includes("-h")) {
    displayHelp({ commandName, schema });
    process.exit(0);
  }

  // Parse arguments
  const parsedArgs = parseRawArguments(argv);
  
  // Merge with environment variables (CLI args take precedence)
  const envDefaults = {
    ...(env.SALEOR_URL && { url: env.SALEOR_URL }),
    ...(env.SALEOR_TOKEN && { token: env.SALEOR_TOKEN }),
    ...(env.SALEOR_CONFIG && { config: env.SALEOR_CONFIG }),
  };
  
  const finalArgs = { ...envDefaults, ...parsedArgs };

  // Validate with schema
  try {
    return schema.parse(finalArgs);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid arguments provided:\n");
      
      error.errors.forEach(err => {
        const field = err.path.join(".");
        const envVar = `SALEOR_${field.toUpperCase()}`;
        console.error(`  • ${err.message} (--${field} or ${envVar})`);
      });
      
      console.error(`\n💡 Run 'npm run ${commandName} -- --help' for usage information`);
      process.exit(1);
    }
    throw error;
  }
}
