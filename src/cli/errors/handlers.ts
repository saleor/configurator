/**
 * CLI Error Handlers and Factory Functions
 * 
 * This module provides utilities for creating and handling CLI errors in a consistent manner.
 * It ensures all errors follow the same pattern and are properly typed.
 */

import type { CliError, ValidationError } from './types';

/**
 * Factory function to create CLI-specific errors with immutable properties
 * @param message - Error message
 * @param helpText - Optional help text to display
 * @returns Properly typed CLI error with immutable properties
 */
export function createCliError(message: string, helpText?: string): CliError {
  const error = new Error(message) as CliError;
  
  // Make properties immutable
  Object.defineProperty(error, 'isCliError', { 
    value: true, 
    writable: false, 
    enumerable: true, 
    configurable: false 
  });
  
  if (helpText) {
    Object.defineProperty(error, 'helpText', { 
      value: helpText, 
      writable: false, 
      enumerable: true, 
      configurable: false 
    });
  }
  
  return error;
}

/**
 * Factory function to create validation-specific errors
 * @param field - The field that failed validation
 * @param value - The invalid value
 * @param expectedType - The expected type or format
 * @param helpText - Optional help text
 * @returns Properly typed validation error
 */
export function createValidationError(
  field: string,
  value: unknown,
  expectedType: string,
  helpText?: string
): ValidationError {
  const message = `Invalid value for '${field}': expected ${expectedType}, got ${typeof value}`;
  const error = createCliError(message, helpText) as ValidationError;
  
  // Add validation-specific properties
  Object.defineProperty(error, 'field', { 
    value: field, 
    writable: false, 
    enumerable: true, 
    configurable: false 
  });
  
  Object.defineProperty(error, 'value', { 
    value, 
    writable: false, 
    enumerable: true, 
    configurable: false 
  });
  
  Object.defineProperty(error, 'expectedType', { 
    value: expectedType, 
    writable: false, 
    enumerable: true, 
    configurable: false 
  });
  
  return error;
}

/**
 * Handles CLI errors by providing consistent error messaging and exit codes
 * @param error - The error to handle
 * @param commandName - The command that triggered the error
 */
export function handleCliError(error: unknown, commandName: string = 'command'): never {
  if (error instanceof Error && 'isCliError' in error) {
    const cliError = error as CliError;
    console.error(`❌ ${cliError.message}`);
    
    if (cliError.helpText) {
      console.error(`\n💡 ${cliError.helpText}`);
    }
    
    console.error(`\n🔍 Run 'npm run ${commandName} -- --help' for usage information`);
  } else {
    console.error(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  process.exit(1);
} 