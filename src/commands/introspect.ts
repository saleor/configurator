import type { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema, confirmAction } from "../cli/command";
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { ConfigurationValidationError } from "../core/diff/errors";
import { createBackup, fileExists } from "../lib/utils/file";

export const introspectCommandSchema = baseCommandArgsSchema;

export type IntrospectCommandArgs = z.infer<typeof introspectCommandSchema>;

async function checkFileExists(configPath: string): Promise<boolean> {
  try {
    const fs = await import("fs/promises");
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}

async function analyzeConfigurationDifferences(
  args: IntrospectCommandArgs
): Promise<boolean> {
  if (!fileExists(args.config)) {
    throw new Error("Local configuration file not found");
  }

  cliConsole.warn(
    "📊 Analyzing differences between remote and local configuration..."
  );

  const configurator = createConfigurator(args);
  const { summary, output } = await configurator.diff();

  cliConsole.info(output);

  if (summary.totalChanges === 0) {
    cliConsole.success("✅ Local configuration is already up to date!");
    return false; // No need to proceed
  }

  return await confirmIntrospection();
}

async function confirmIntrospection(): Promise<boolean> {
  cliConsole.warn(
    "⚠️  Introspecting will overwrite your local configuration file."
  );

  const userConfirmed = await confirmAction(
    "Do you want to continue and update the local file?",
    "This will overwrite your current local configuration with the remote state.",
    false
  );

  if (!userConfirmed) {
    cliConsole.cancelled("Operation cancelled by user");
    return false;
  }

  return true;
}

async function createConfigurationBackup(configPath: string): Promise<void> {
  cliConsole.info("💾 Creating backup of existing configuration...");

  const backupPath = await createBackup(configPath);
  if (backupPath) {
    cliConsole.info(`   Backup saved to: ${backupPath}`);
  }
}

async function executeIntrospection(
  args: IntrospectCommandArgs
): Promise<void> {
  const configurator = createConfigurator(args);
  cliConsole.processing("🌐 Introspecting configuration from Saleor...");

  await configurator.introspect();

  const configPath = cliConsole.important(args.config);
  cliConsole.success(`\n✅ Configuration successfully saved to ${configPath}`);
  process.exit(0);
}

export async function introspectHandler(
  args: IntrospectCommandArgs
): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  cliConsole.header("🔍 Saleor Configuration Introspect\n");

  const fileExists = await checkFileExists(args.config);

  if (fileExists) {
    cliConsole.warn(
      `Local configuration file "${args.config}" already exists.`
    );
  }

  try {
    const shouldProceed = await analyzeConfigurationDifferences(args);

    if (!shouldProceed) {
      process.exit(0);
    }

    await createConfigurationBackup(args.config);
    await executeIntrospection(args);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      handleValidationError(error);
      process.exit(1);
    }
    throw error;
  }
}

function handleValidationError(error: ConfigurationValidationError): void {
  // Clear visual separation
  cliConsole.text("");
  
  // Main error header - clean and professional
  cliConsole.title(`${cliConsole.icon('error')} Configuration Validation Failed`);
  cliConsole.separator("═", 60);
  
  // File context with clean formatting
  cliConsole.text("");
  cliConsole.field("File", cliConsole.path(error.filePath));
  cliConsole.field("Errors found", cliConsole.value(error.validationErrors.length.toString()));
  cliConsole.text("");

  // Group errors by type for better readability
  const errorsByType = groupValidationErrors(error.validationErrors);
  
  // Display errors by category with cleaner formatting
  Object.entries(errorsByType).forEach(([errorType, errors], categoryIndex) => {
    if (categoryIndex > 0) cliConsole.text("");
    
    cliConsole.subtitle(`${getErrorIcon(errorType)} ${getErrorCategoryTitle(errorType)} (${errors.length})`);
    cliConsole.separator("─", 40);
    
    errors.forEach((err, index) => {
      const pathDisplay = formatPath(err.path);
      const messageDisplay = formatErrorMessage(err.message, errorType);
      const suggestion = getFieldSuggestion(err.path, err.message);
      
      cliConsole.text(`  ${index + 1}. ${pathDisplay}`);
      cliConsole.text(`     ${messageDisplay}`);
      if (suggestion) {
        cliConsole.muted(`     💡 ${suggestion}`);
      }
      
      if (index < errors.length - 1) cliConsole.text("");
    });
  });

  // Action items section with cleaner styling
  cliConsole.text("");
  cliConsole.separator("═", 60);
  cliConsole.subtitle(`🔧 How to Fix These Issues`);
  cliConsole.text("");
  
  const suggestions = getContextualSuggestions(error.validationErrors);
  suggestions.forEach((suggestion, index) => {
    cliConsole.text(`  ${index + 1}. ${suggestion}`);
  });
  
  cliConsole.text("");
  cliConsole.box([
    "Need help? Check these resources:",
    "• SCHEMA.md - Complete configuration reference",
    "• example.yml - Working configuration example", 
    "• Run with --verbose for detailed field descriptions"
  ], "Additional Resources");
  
  cliConsole.text("");
}

function groupValidationErrors(errors: { path: string; message: string }[]) {
  const groups: Record<string, { path: string; message: string }[]> = {
    required: [],
    type: [],
    format: [],
    other: []
  };
  
  errors.forEach(error => {
    if (error.message.toLowerCase().includes('required')) {
      groups.required.push(error);
    } else if (error.message.toLowerCase().includes('invalid_type') || error.message.toLowerCase().includes('expected')) {
      groups.type.push(error);
    } else if (error.message.toLowerCase().includes('invalid') && !error.message.toLowerCase().includes('type')) {
      groups.format.push(error);
    } else {
      groups.other.push(error);
    }
  });
  
  // Remove empty groups
  return Object.fromEntries(
    Object.entries(groups).filter(([, errors]) => errors.length > 0)
  );
}

function getErrorIcon(errorType: string): string {
  const icons = {
    required: '📋',
    type: '🔧',
    format: '📝',
    other: '❓'
  };
  return icons[errorType as keyof typeof icons] || '❓';
}

function getErrorCategoryTitle(errorType: string): string {
  const titles = {
    required: 'Missing Required Fields',
    type: 'Type Mismatches',
    format: 'Format Issues',
    other: 'Other Validation Errors'
  };
  return titles[errorType as keyof typeof titles] || 'Validation Errors';
}

function formatPath(path: string): string {
  // Make path more readable with minimal, clean colors
  const parts = path.split('.');
  if (parts.length === 1) {
    return cliConsole.path(path);
  }
  
  const [section, index, ...field] = parts;
  const fieldPath = field.join('.');
  
  if (index && !isNaN(Number(index))) {
    return `${cliConsole.type(section)}[${index}]${fieldPath ? `.${fieldPath}` : ''}`;
  }
  
  return `${cliConsole.type(parts[0])}.${parts.slice(1).join('.')}`;
}

function formatErrorMessage(message: string, errorType: string): string {
  // Clean error message formatting without excessive colors
  if (message.toLowerCase().includes('required')) {
    return `● This field is required but is missing`;
  }
  
  if (message.includes('Expected') && message.includes('received')) {
    const match = message.match(/Expected (\w+), received (\w+)/);
    if (match) {
      const [, expected, received] = match;
      return `● Expected ${expected} but got ${received}`;
    }
  }
  
  return `● ${message}`;
}

function getFieldSuggestion(path: string, message: string): string | null {
  const fieldName = path.split('.').pop()?.toLowerCase();
  
  // Specific suggestions for common fields
  const suggestions: Record<string, string> = {
    category: 'Add a category name (e.g., "Electronics", "Clothing")',
    name: 'Provide a descriptive name for this item',
    slug: 'Use lowercase letters, numbers, and hyphens only',
    currencycode: 'Use a 3-letter currency code (e.g., "USD", "EUR")',
    defaultcountry: 'Use a 2-letter country code (e.g., "US", "GB")',
    sustainable: 'Use "Yes" or "No" instead of true/false',
    attributes: 'Attributes must be strings or arrays of strings'
  };
  
  if (fieldName && suggestions[fieldName]) {
    return suggestions[fieldName];
  }
  
  if (message.toLowerCase().includes('required')) {
    return 'This field must be provided';
  }
  
  if (message.includes('boolean') && message.includes('string')) {
    return 'Change true/false to "Yes"/"No" or text values';
  }
  
  return null;
}

function getContextualSuggestions(errors: { path: string; message: string }[]): string[] {
  const suggestions = [];
  
  const hasRequiredErrors = errors.some(e => e.message.toLowerCase().includes('required'));
  const hasTypeErrors = errors.some(e => e.message.toLowerCase().includes('type') || e.message.toLowerCase().includes('expected'));
  const hasProductErrors = errors.some(e => e.path.includes('product'));
  const hasCategoryErrors = errors.some(e => e.path.includes('category'));
  
  if (hasRequiredErrors) {
    suggestions.push("Fill in all required fields marked above");
  }
  
  if (hasTypeErrors) {
    suggestions.push("Check data types - use strings for text, numbers for quantities");
  }
  
  if (hasCategoryErrors) {
    suggestions.push("Add a 'categories' section and assign products to valid categories");
  }
  
  if (hasProductErrors) {
    suggestions.push("Ensure each product has name, productType, category, and variants");
  }
  
  suggestions.push("Validate your YAML syntax using an online YAML validator");
  suggestions.push("Compare your config with the working examples in the repository");
  
  return suggestions;
}

export const introspectCommandConfig: CommandConfig<
  typeof introspectCommandSchema
> = {
  name: "introspect",
  description:
    "Downloads the current configuration from the remote Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  requiresInteractive: true,
  examples: [
    "configurator introspect -u https://my-shop.saleor.cloud/graphql/ -t <token>",
    "configurator introspect --config output.yml",
    "configurator introspect --quiet",
  ],
};
