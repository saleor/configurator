/**
 * CLI Help Display
 * 
 * This module handles the display and rendering of help text to the console.
 * It provides utilities for showing help information in a user-friendly format.
 */

import type { z } from 'zod';
import type { HelpDisplayOptions } from '../errors/types';
import { generateHelpSections } from './formatter';

/**
 * Display comprehensive help for a command
 * @param options - Help display options containing command name and schema
 */
export function displayHelp({ commandName, schema }: HelpDisplayOptions): void {
  const sections = generateHelpSections(commandName, schema);
  
  // Clear screen for better visibility (optional)
  // console.clear();
  
  console.log(`\n📖 ${commandName.toUpperCase()} Command Help\n`);
  
  sections.forEach(section => {
    console.log(section);
  });
  
  // Add final separator for better readability
  console.log('─'.repeat(60));
  console.log('');
}

/**
 * Display a quick usage summary (shorter version of help)
 * @param options - Help display options
 */
export function displayUsage({ commandName, schema }: HelpDisplayOptions): void {
  console.log(`\n📋 ${commandName.toUpperCase()} Usage Summary\n`);
  
  const sections = generateHelpSections(commandName, schema, {
    showEnvironmentVariables: false,
    showExamples: false,
    showTips: false,
    environmentPrefix: 'SALEOR_',
    maxWidth: 80,
  });
  
  // Only show the first few sections (header, required, optional)
  sections.slice(0, 3).forEach(section => {
    console.log(section);
  });
  
  console.log(`💡 Run 'npm run ${commandName} -- --help' for detailed help\n`);
}

/**
 * Display error message with contextual help
 * @param error - The error that occurred
 * @param commandName - Name of the command that failed
 * @param schema - Command schema for contextual help
 */
export function displayErrorWithHelp(
  error: string | Error,
  commandName: string,
  schema?: z.ZodObject<z.ZodRawShape>
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  
  console.error(`\n❌ Error: ${errorMessage}\n`);
  
  if (schema) {
    console.error('📖 Here\'s what you need to provide:\n');
    displayUsage({ commandName, schema });
  } else {
    console.error(`💡 Run 'npm run ${commandName} -- --help' for usage information\n`);
  }
}

/**
 * Display a list of available commands
 * @param commands - Array of available command names
 */
export function displayAvailableCommands(commands: string[]): void {
  console.log('\n📚 Available Commands:\n');
  
  commands.forEach(command => {
    console.log(`  npm run ${command} -- [options]`);
  });
  
  console.log('\n💡 Add --help to any command for detailed usage information');
  console.log('   Example: npm run diff -- --help\n');
}

/**
 * Display version information (if available)
 * @param version - Version string
 * @param name - Application name
 */
export function displayVersion(version?: string, name: string = 'Saleor Configurator'): void {
  if (version) {
    console.log(`\n${name} v${version}\n`);
  } else {
    console.log(`\n${name}\n`);
  }
} 