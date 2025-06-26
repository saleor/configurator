/**
 * CLI Argument Validation
 * 
 * This module handles validation of parsed CLI arguments against Zod schemas.
 * It provides utilities for extracting descriptions and validating arguments with detailed error reporting.
 */

import { z } from 'zod';
import type { ParsedArgs, SchemaValidationResult } from '../schemas/types';
import { createValidationError } from '../errors/handlers';

/**
 * Extract all field descriptions from a Zod object schema
 * Handles nested optional, default, and other wrapper schemas
 * 
 * @param schema - The Zod object schema to extract descriptions from
 * @returns Record mapping field names to their descriptions
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
 * Recursively unwraps optional, default, and other wrapper schemas
 * 
 * @param fieldSchema - The field schema to extract description from
 * @returns The description string if found
 */
function extractFieldDescription(fieldSchema: z.ZodTypeAny): string | undefined {
  let currentSchema = fieldSchema;
  
  // Check current level first for performance
  let description = getDirectDescription(currentSchema);
  if (description) return description;

  // Unwrap nested schemas with safety limit
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;
  
  while (!description && depth < maxDepth) {
    // Check if we can unwrap further
    const unwrapped = unwrapSchema(currentSchema);
    if (!unwrapped || unwrapped === currentSchema) break;
    
    currentSchema = unwrapped;
    description = getDirectDescription(currentSchema);
    depth++;
  }

  return description;
}

/**
 * Unwrap a single layer of schema wrapper (Optional, Default, etc.)
 * @param schema - Schema to unwrap
 * @returns Unwrapped schema or null if not unwrappable
 */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny | null {
  if (schema instanceof z.ZodOptional) {
    return schema.unwrap();
  }
  
  if (schema instanceof z.ZodDefault) {
    return schema._def.innerType;
  }
  
  if (schema instanceof z.ZodNullable) {
    return schema.unwrap();
  }
  
  // Add more wrapper types as needed
  return null;
}

/**
 * Get description directly from schema definition
 * @param schema - Schema to get description from
 * @returns Description string if present
 */
function getDirectDescription(schema: z.ZodTypeAny): string | undefined {
  return (schema as any)._def?.description;
}

/**
 * Validate parsed arguments against a schema with detailed error reporting
 * @param schema - The Zod schema to validate against
 * @param parsedArgs - The parsed CLI arguments
 * @returns Validation result with success flag and data or errors
 */
export function validateArguments<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  parsedArgs: ParsedArgs
): SchemaValidationResult<z.ZodObject<T>> {
  try {
    const validatedArgs = schema.parse(parsedArgs);
    return {
      success: true,
      data: validatedArgs,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error,
      };
    }
    
    // Re-throw non-Zod errors
    throw error;
  }
}

/**
 * Format validation errors into user-friendly messages
 * @param errors - Array of Zod validation errors
 * @returns Array of formatted error messages
 */
export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map(error => {
    const field = error.path.join('.');
    const fieldDisplay = field || 'argument';
    
    switch (error.code) {
      case 'invalid_type':
        return `Invalid type for ${fieldDisplay}: expected ${error.expected}, got ${error.received}`;
      
      case 'too_small':
        if (error.type === 'string') {
          return `${fieldDisplay} must be at least ${error.minimum} characters long`;
        }
        return `${fieldDisplay} must be at least ${error.minimum}`;
      
      case 'too_big':
        if (error.type === 'string') {
          return `${fieldDisplay} must be at most ${error.maximum} characters long`;
        }
        return `${fieldDisplay} must be at most ${error.maximum}`;
      
      case 'invalid_string':
        if (error.validation === 'url') {
          return `${fieldDisplay} must be a valid URL`;
        }
        if (error.validation === 'email') {
          return `${fieldDisplay} must be a valid email address`;
        }
        return `${fieldDisplay} format is invalid`;
      
      case 'invalid_enum_value':
        return `${fieldDisplay} must be one of: ${error.options.join(', ')}`;
      
      case 'custom':
        return error.message;
      
      default:
        return `${fieldDisplay}: ${error.message}`;
    }
  });
}

/**
 * Categorize schema fields into required and optional
 * @param schema - The schema to categorize
 * @returns Object with required and optional field arrays
 */
export function categorizeSchemaFields<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): { required: string[]; optional: string[] } {
  const required: string[] = [];
  const optional: string[] = [];
  
  Object.entries(schema.shape).forEach(([key, fieldSchema]) => {
    if (isFieldOptional(fieldSchema as z.ZodTypeAny)) {
      optional.push(key);
    } else {
      required.push(key);
    }
  });

  return { required, optional };
}

/**
 * Check if a field schema is optional (has default or is marked optional)
 * @param fieldSchema - The field schema to check
 * @returns True if the field is optional
 */
function isFieldOptional(fieldSchema: z.ZodTypeAny): boolean {
  return fieldSchema instanceof z.ZodDefault || 
         fieldSchema instanceof z.ZodOptional ||
         fieldSchema instanceof z.ZodNullable;
} 