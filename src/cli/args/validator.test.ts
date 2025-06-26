import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { 
  extractSchemaDescriptions,
  validateArguments,
  formatValidationErrors,
  categorizeSchemaFields
} from './validator';

describe('extractSchemaDescriptions', () => {
  it('should extract descriptions from simple schema fields', () => {
    // Arrange
    const schema = z.object({
      url: z.string().describe('API endpoint URL'),
      token: z.string().describe('Authentication token'),
      count: z.number().describe('Number of items')
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({
      url: 'API endpoint URL',
      token: 'Authentication token',
      count: 'Number of items'
    });
  });

  it('should extract descriptions from optional fields', () => {
    // Arrange
    const schema = z.object({
      required: z.string().describe('Required field'),
      optional: z.string().optional().describe('Optional field')
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({
      required: 'Required field',
      optional: 'Optional field'
    });
  });

  it('should extract descriptions from default fields', () => {
    // Arrange
    const schema = z.object({
      config: z.string().default('config.yml').describe('Configuration file path'),
      verbose: z.boolean().default(false).describe('Enable verbose output')
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({
      config: 'Configuration file path',
      verbose: 'Enable verbose output'
    });
  });

  it('should handle nested wrapper types', () => {
    // Arrange
    const schema = z.object({
      nested: z.string().optional().nullable().describe('Deeply nested field')
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({
      nested: 'Deeply nested field'
    });
  });

  it('should return empty object for schema without descriptions', () => {
    // Arrange
    const schema = z.object({
      field1: z.string(),
      field2: z.number(),
      field3: z.boolean()
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({});
  });

  it('should ignore fields without descriptions', () => {
    // Arrange
    const schema = z.object({
      withDescription: z.string().describe('Has description'),
      withoutDescription: z.string(),
      alsoWithDescription: z.number().describe('Also has description')
    });

    // Act
    const descriptions = extractSchemaDescriptions(schema);

    // Assert
    expect(descriptions).toEqual({
      withDescription: 'Has description',
      alsoWithDescription: 'Also has description'
    });
  });
});

describe('validateArguments', () => {
  const testSchema = z.object({
    url: z.string().url(),
    token: z.string().min(1),
    count: z.string().optional(),
    verbose: z.boolean().default(false)
  });

     it('should validate correct arguments successfully', () => {
     // Arrange
     const args = {
       url: 'https://api.example.com',
       token: 'valid-token',
       count: '10',
       verbose: true
     };

     // Act
     const result = validateArguments(testSchema, args);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        url: 'https://api.example.com',
        token: 'valid-token',
        count: '10',
        verbose: true
      });
    }
  });

  it('should apply default values for missing optional fields', () => {
    // Arrange
    const args = {
      url: 'https://api.example.com',
      token: 'valid-token'
    };

    // Act
    const result = validateArguments(testSchema, args);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verbose).toBe(false);
    }
  });

  it('should return validation errors for invalid arguments', () => {
    // Arrange
    const args = {
      url: 'not-a-valid-url',
      token: '',
      count: 'some-value'
    };

    // Act
    const result = validateArguments(testSchema, args);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(2);
      expect(result.error.issues.some(e => e.path[0] === 'url')).toBe(true);
      expect(result.error.issues.some(e => e.path[0] === 'token')).toBe(true);
    }
  });

  it('should return errors for missing required fields', () => {
    // Arrange
    const args = {
      verbose: true
    };

    // Act
    const result = validateArguments(testSchema, args);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(e => e.path[0] === 'url')).toBe(true);
      expect(result.error.issues.some(e => e.path[0] === 'token')).toBe(true);
    }
  });

  it('should handle empty arguments object', () => {
    // Arrange
    const args = {};

    // Act
    const result = validateArguments(testSchema, args);

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('formatValidationErrors', () => {
  it('should format invalid_type errors correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'invalid_type',
      path: ['count'],
      message: 'Expected number, received string',
      expected: 'number',
      received: 'string'
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'Invalid type for count: expected number, got string'
    ]);
  });

  it('should format too_small errors for strings correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'too_small',
      path: ['token'],
      message: 'String must contain at least 1 character(s)',
      type: 'string',
      minimum: 1,
      inclusive: true
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'token must be at least 1 characters long'
    ]);
  });

  it('should format too_big errors for numbers correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'too_big',
      path: ['count'],
      message: 'Number must be less than or equal to 100',
      type: 'number',
      maximum: 100,
      inclusive: true
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'count must be at most 100'
    ]);
  });

  it('should format invalid_string errors for URLs correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'invalid_string',
      path: ['url'],
      message: 'Invalid url',
      validation: 'url'
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'url must be a valid URL'
    ]);
  });

  it('should format invalid_enum_value errors correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'invalid_enum_value',
      path: ['format'],
      message: 'Invalid enum value',
      options: ['table', 'json', 'summary'],
      received: 'xml'
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'format must be one of: table, json, summary'
    ]);
  });

  it('should format custom validation errors correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'custom',
      path: ['custom'],
      message: 'Custom validation failed'
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'Custom validation failed'
    ]);
  });

  it('should handle errors without path correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [{
      code: 'invalid_type',
      path: [],
      message: 'Invalid input',
      expected: 'object',
      received: 'string'
    }];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'Invalid type for argument: expected object, got string'
    ]);
  });

  it('should handle multiple errors correctly', () => {
    // Arrange
    const errors: z.ZodIssue[] = [
      {
        code: 'invalid_type',
        path: ['url'],
        message: 'Expected string, received number',
        expected: 'string',
        received: 'number'
      },
      {
        code: 'too_small',
        path: ['token'],
        message: 'String must contain at least 1 character(s)',
        type: 'string',
        minimum: 1,
        inclusive: true
      }
    ];

    // Act
    const formatted = formatValidationErrors(errors);

    // Assert
    expect(formatted).toEqual([
      'Invalid type for url: expected string, got number',
      'token must be at least 1 characters long'
    ]);
  });
});

describe('categorizeSchemaFields', () => {
  it('should categorize fields correctly', () => {
    // Arrange
    const schema = z.object({
      required1: z.string(),
      required2: z.number(),
      optional1: z.string().optional(),
      default1: z.boolean().default(false),
      nullable1: z.string().nullable()
    });

    // Act
    const result = categorizeSchemaFields(schema);

    // Assert
    expect(result.required).toEqual(['required1', 'required2']);
    expect(result.optional).toEqual(['optional1', 'default1', 'nullable1']);
  });

  it('should handle schema with only required fields', () => {
    // Arrange
    const schema = z.object({
      field1: z.string(),
      field2: z.number(),
      field3: z.boolean()
    });

    // Act
    const result = categorizeSchemaFields(schema);

    // Assert
    expect(result.required).toEqual(['field1', 'field2', 'field3']);
    expect(result.optional).toEqual([]);
  });

  it('should handle schema with only optional fields', () => {
    // Arrange
    const schema = z.object({
      field1: z.string().optional(),
      field2: z.number().default(42),
      field3: z.boolean().nullable()
    });

    // Act
    const result = categorizeSchemaFields(schema);

    // Assert
    expect(result.required).toEqual([]);
    expect(result.optional).toEqual(['field1', 'field2', 'field3']);
  });

  it('should handle empty schema', () => {
    // Arrange
    const schema = z.object({});

    // Act
    const result = categorizeSchemaFields(schema);

    // Assert
    expect(result.required).toEqual([]);
    expect(result.optional).toEqual([]);
  });
}); 