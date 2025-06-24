import { z } from "zod";

export interface CliError extends Error {
  isCliError: true;
  helpText?: string;
}

/**
 * Creates a CLI error with helpful messaging
 */
function createCliError(message: string, helpText?: string): CliError {
  const error = new Error(message) as CliError;
  error.isCliError = true;
  error.helpText = helpText;
  return error;
}

/**
 * Argument descriptions for better help text
 */
const argDescriptions: Record<string, string> = {
  url: "Saleor GraphQL endpoint URL",
  token: "Saleor authentication token (staff user with proper permissions)", 
  config: "Path to configuration file",
  format: "Output format (table, json, summary)",
  filter: "Filter by entity types (comma-separated: channels,shop,producttypes,pagetypes,categories)",
  quiet: "Suppress progress messages",
  verbose: "Show detailed debug information",
  force: "Skip confirmation prompts and overwrite files without asking",
  dryRun: "Preview changes without making any modifications (dry-run mode)",
  skipValidation: "Skip validation checks and diff comparison (advanced users only)",
};

/**
 * Displays help information for CLI commands
 */
function displayHelp(commandName: string, schema: z.ZodObject<any>): void {
  console.log(`\n📖 ${commandName.toUpperCase()} Command Help\n`);
  
  const shape = schema.shape;
  const required: string[] = [];
  const optional: string[] = [];
  
  // Categorize fields
  Object.entries(shape).forEach(([key, fieldSchema]) => {
    if (fieldSchema instanceof z.ZodDefault || fieldSchema instanceof z.ZodOptional) {
      optional.push(key);
    } else {
      required.push(key);
    }
  });
  
  if (required.length > 0) {
    console.log("🔴 Required Arguments:");
    required.forEach(arg => {
      const envVar = `SALEOR_${arg.toUpperCase()}`;
      const description = argDescriptions[arg] || "";
      console.log(`  --${arg} <value>`);
      console.log(`      ${description}`);
      console.log(`      Environment: ${envVar}`);
      console.log("");
    });
  }
  
  if (optional.length > 0) {
    console.log("🟡 Optional Arguments:");
    optional.forEach(arg => {
      const description = argDescriptions[arg] || "";
      console.log(`  --${arg} <value>`);
      if (description) {
        console.log(`      ${description}`);
      }
      console.log("");
    });
  }
  
  console.log("📝 Examples:");
  console.log(`  # Using command line arguments`);
  console.log(`  npm run ${commandName} -- --url https://demo.saleor.io/graphql/ --token your-token`);
  console.log(``);
  console.log(`  # Using environment variables`);
  console.log(`  SALEOR_URL=https://demo.saleor.io/graphql/ SALEOR_TOKEN=your-token npm run ${commandName}`);
  console.log(``);
  
  if (commandName === "diff") {
    console.log(`  # Diff-specific examples`);
    console.log(`  npm run diff -- --url ... --token ... --format summary`);
    console.log(`  npm run diff -- --url ... --token ... --filter channels,shop --quiet`);
    console.log(``);
  }
  
  console.log("💡 Tips:");
  console.log("  • Create a .env file with your credentials (see .env.example)");
  console.log("  • Use --quiet for CI/CD environments"); 
  console.log("  • Use --verbose for debugging issues");
  console.log("");
}

/**
 * Parses command line arguments and validates them using a zod schema
 * @param schema - Zod schema to validate the arguments
 * @param commandName - Name of the command for help text
 * @returns Validated arguments object
 */
export function parseCliArgs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  commandName: string = "command"
): z.infer<z.ZodObject<T>> {
  // Parse command line arguments manually
  const rawArgs = process.argv.slice(2);
  const parsedArgs: Record<string, string | boolean> = {};

  // Check for help flag first
  if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
    displayHelp(commandName, schema);
    process.exit(0);
  }

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg.startsWith("--")) {
      // Handle --key=value format
      if (arg.includes("=")) {
        const [key, ...valueParts] = arg.slice(2).split("=");
        const value = valueParts.join("="); // Rejoin in case value contains =
        parsedArgs[key] = value;
      } else {
        // Handle --key value format
        const key = arg.slice(2);
        const value = rawArgs[i + 1];
        if (value && !value.startsWith("--")) {
          parsedArgs[key] = value;
          i++; // Skip the value in next iteration
        } else {
          // Boolean flag
          parsedArgs[key] = true;
        }
      }
    }
  }

  // Add environment variable defaults
  const envDefaults: Record<string, string> = {};
  if (process.env.SALEOR_URL) envDefaults.url = process.env.SALEOR_URL;
  if (process.env.SALEOR_TOKEN) envDefaults.token = process.env.SALEOR_TOKEN;
  if (process.env.SALEOR_CONFIG) envDefaults.config = process.env.SALEOR_CONFIG;

  // Merge environment defaults with parsed args (CLI args take precedence)
  const finalArgs = { ...envDefaults, ...parsedArgs };

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
