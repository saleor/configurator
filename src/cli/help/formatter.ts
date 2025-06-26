/**
 * CLI Help Text Formatting
 * 
 * This module handles the formatting and generation of help text for CLI commands.
 * It provides utilities for creating well-structured, readable help documentation.
 */

import type { z } from 'zod';
import { extractSchemaDescriptions, categorizeSchemaFields } from '../args/validator';
import { getEnvironmentHelpText } from '../args/environment';

/**
 * Configuration for help text formatting
 */
interface HelpFormattingConfig {
  readonly showEnvironmentVariables: boolean;  
  readonly showExamples: boolean;
  readonly showTips: boolean;
  readonly environmentPrefix: string;
  readonly maxWidth: number;
}

/**
 * Default help formatting configuration
 */
const DEFAULT_HELP_CONFIG: HelpFormattingConfig = {
  showEnvironmentVariables: true,
  showExamples: true,
  showTips: true,
  environmentPrefix: 'SALEOR_',
  maxWidth: 80,
} as const;

/**
 * Generate comprehensive help sections for a command
 * @param commandName - Name of the command
 * @param schema - Zod schema for the command arguments
 * @param config - Formatting configuration
 * @returns Array of formatted help sections
 */
export function generateHelpSections<T extends z.ZodRawShape>(
  commandName: string,
  schema: z.ZodObject<T>,
  config: HelpFormattingConfig = DEFAULT_HELP_CONFIG
): string[] {
  const { required, optional } = categorizeSchemaFields(schema);
  const descriptions = extractSchemaDescriptions(schema);
  
  const sections: string[] = [];

  // Command header
  sections.push(formatCommandHeader(commandName));

  // Required arguments section
  if (required.length > 0) {
    sections.push(formatArgumentSection(
      "🔴 Required Arguments",
      required,
      descriptions,
      config.showEnvironmentVariables,
      config.environmentPrefix
    ));
  }

  // Optional arguments section  
  if (optional.length > 0) {
    sections.push(formatArgumentSection(
      "🟡 Optional Arguments",
      optional,
      descriptions,
      false, // Don't show env vars for optional args
      config.environmentPrefix
    ));
  }

  // Environment variables section
  if (config.showEnvironmentVariables) {
    sections.push(getEnvironmentHelpText());
  }

  // Examples section
  if (config.showExamples) {
    sections.push(generateExamplesSection(commandName));
  }

  // Tips section
  if (config.showTips) {
    sections.push(generateTipsSection());
  }

  return sections;
}

/**
 * Format the command header
 * @param commandName - Name of the command
 * @returns Formatted header string
 */
function formatCommandHeader(commandName: string): string {
  return `📖 ${commandName.toUpperCase()} Command Help\n`;
}

/**
 * Format a section of arguments (required or optional)
 * @param title - Section title
 * @param args - Array of argument names
 * @param descriptions - Mapping of argument names to descriptions
 * @param showEnvVars - Whether to show environment variable alternatives
 * @param envPrefix - Environment variable prefix
 * @returns Formatted argument section
 */
export function formatArgumentSection(
  title: string,
  args: string[],
  descriptions: Record<string, string>,
  showEnvVars: boolean,
  envPrefix: string = 'SALEOR_'
): string {
  const lines = [title];
  
  args.forEach(arg => {
    // Argument name
    lines.push(`  --${arg} <value>`);
    
    // Description with proper indentation
    const description = descriptions[arg];
    if (description) {
      const wrappedDescription = wrapText(description, 60, 6);
      lines.push(wrappedDescription);
    }
    
    // Environment variable alternative
    if (showEnvVars) {
      const envVar = `${envPrefix}${arg.toUpperCase()}`;
      lines.push(`      Environment: ${envVar}`);
    }
    
    lines.push(""); // Empty line for spacing
  });

  return lines.join("\n");
}

/**
 * Generate examples section for a specific command
 * @param commandName - Name of the command
 * @returns Formatted examples section
 */
function generateExamplesSection(commandName: string): string {
  const examples = [
    "📝 Usage Examples:",
    "",
    "  # Using command line arguments",
    `  npm run ${commandName} -- --url https://demo.saleor.io/graphql/ --token your-token`,
    "",
    "  # Using environment variables", 
    `  SALEOR_API_URL=https://demo.saleor.io/graphql/ SALEOR_AUTH_TOKEN=your-token npm run ${commandName}`,
    "",
  ];

  // Add command-specific examples
  if (commandName === 'diff') {
    examples.push(
      "  # Diff command specific examples",
      "  npm run diff -- --url ... --token ... --format summary",
      "  npm run diff -- --url ... --token ... --filter channels,shop --quiet",
      ""
    );
  }

  if (commandName === 'push') {
    examples.push(
      "  # Push command specific examples", 
      "  npm run push -- --url ... --token ... --config production.yml",
      "  npm run push -- --url ... --token ... --verbose --config staging.yml",
      ""
    );
  }

  if (commandName === 'introspect') {
    examples.push(
      "  # Introspect command specific examples",
      `  npm run introspect -- --url ... --token ... --config downloaded.yml`, 
      `  npm run introspect -- --url ... --token ... --quiet --force`,
      `  npm run introspect -- --url ... --token ... --dry-run`,
      ""
    );
  }

  return examples.join("\n");
}

/**
 * Generate tips section with helpful information
 * @returns Formatted tips section
 */
function generateTipsSection(): string {
  return [
    "💡 Tips & Best Practices:",
    "  • Create a .env file with your credentials for convenience",
    "  • Use --quiet flag in CI/CD environments to reduce output",
    "  • Use --verbose flag when debugging configuration issues", 
    "  • Always test configuration changes in a staging environment first",
    "  • Keep your authentication tokens secure and rotate them regularly",
    "",
  ].join("\n");
}

/**
 * Wrap text to specified width with proper indentation
 * @param text - Text to wrap
 * @param maxWidth - Maximum line width
 * @param indent - Number of spaces to indent
 * @returns Wrapped and indented text
 */
function wrapText(text: string, maxWidth: number, indent: number): string {
  const indentStr = ' '.repeat(indent);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = indentStr;

  for (const word of words) {
    const testLine = currentLine === indentStr ? currentLine + word : currentLine + ' ' + word;
    
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine !== indentStr) {
        lines.push(currentLine);
      }
      currentLine = indentStr + word;
    }
  }
  
  if (currentLine !== indentStr) {
    lines.push(currentLine);
  }

  return lines.join('\n');
} 