import { describe, it, expect } from 'vitest';
import { 
  extractEnvironmentDefaults,
  environmentToCliArgs,
  validateEnvironmentVariables,
  getEnvironmentHelpText
} from './environment';
import type { EnvironmentVariables } from '../schemas/types';

describe('extractEnvironmentDefaults', () => {
  it('should extract standard Saleor environment variables', () => {
    // Arrange
    const env = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: 'test-token-123',
      SALEOR_CONFIG: 'custom-config.yml',
      OTHER_VAR: 'should-be-ignored'
    };

    // Act
    const result = extractEnvironmentDefaults(env);

    // Assert
    expect(result).toEqual({
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: 'test-token-123',
      SALEOR_CONFIG: 'custom-config.yml'
    });
  });

  it('should handle missing environment variables', () => {
    // Arrange
    const env = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      OTHER_VAR: 'present'
    };

    // Act
    const result = extractEnvironmentDefaults(env);

    // Assert
    expect(result).toEqual({
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    });
  });

  it('should handle empty environment object', () => {
    // Arrange
    const env = {};

    // Act
    const result = extractEnvironmentDefaults(env);

    // Assert
    expect(result).toEqual({
      SALEOR_URL: undefined,
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    });
  });

  it('should use custom configuration', () => {
    // Arrange
    const env = {
      CUSTOM_URL: 'https://custom.api.com',
      CUSTOM_TOKEN: 'custom-token',
      CUSTOM_CONFIG: 'custom.yml'
    };
    const config = {
      prefix: 'CUSTOM_',
      mappings: {
        url: 'CUSTOM_URL',
        token: 'CUSTOM_TOKEN',
        config: 'CUSTOM_CONFIG'
      }
    };

    // Act
    const result = extractEnvironmentDefaults(env, config);

    // Assert
    expect(result).toEqual({
      SALEOR_URL: 'https://custom.api.com',
      SALEOR_TOKEN: 'custom-token',
      SALEOR_CONFIG: 'custom.yml'
    });
  });

  it('should handle undefined env parameter by using process.env', () => {
    // Arrange
    const originalEnv = process.env;
    process.env = {
      SALEOR_URL: 'https://process-env.com',
      SALEOR_TOKEN: 'process-token'
    };

    try {
      // Act
      const result = extractEnvironmentDefaults();

      // Assert
      expect(result.SALEOR_URL).toBe('https://process-env.com');
      expect(result.SALEOR_TOKEN).toBe('process-token');
    } finally {
      // Cleanup
      process.env = originalEnv;
    }
  });
});

describe('environmentToCliArgs', () => {
  it('should convert environment variables to CLI argument format', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: 'test-token-123',
      SALEOR_CONFIG: 'production.yml'
    };

    // Act
    const result = environmentToCliArgs(envVars);

    // Assert
    expect(result).toEqual({
      url: 'https://api.saleor.io/graphql/',
      token: 'test-token-123',
      config: 'production.yml'
    });
  });

  it('should handle undefined environment variables', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    };

    // Act
    const result = environmentToCliArgs(envVars);

    // Assert
    expect(result).toEqual({
      url: 'https://api.saleor.io/graphql/',
      token: undefined,
      config: undefined
    });
  });

  it('should handle all undefined environment variables', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: undefined,
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    };

    // Act
    const result = environmentToCliArgs(envVars);

    // Assert
    expect(result).toEqual({
      url: undefined,
      token: undefined,
      config: undefined
    });
  });
});

describe('validateEnvironmentVariables', () => {
  it('should validate all variables are present when required', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: 'test-token',
      SALEOR_CONFIG: 'config.yml'
    };
    const requiredVars: Array<keyof EnvironmentVariables> = ['SALEOR_URL', 'SALEOR_TOKEN'];

    // Act
    const result = validateEnvironmentVariables(envVars, requiredVars);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should identify missing required variables', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: 'https://api.saleor.io/graphql/',
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    };
    const requiredVars: Array<keyof EnvironmentVariables> = ['SALEOR_URL', 'SALEOR_TOKEN', 'SALEOR_CONFIG'];

    // Act
    const result = validateEnvironmentVariables(envVars, requiredVars);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.missing).toEqual(['SALEOR_TOKEN', 'SALEOR_CONFIG']);
  });

  it('should handle empty required variables array', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: undefined,
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    };
    const requiredVars: Array<keyof EnvironmentVariables> = [];

    // Act
    const result = validateEnvironmentVariables(envVars, requiredVars);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should use default empty array for required variables', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: undefined,
      SALEOR_TOKEN: undefined,
      SALEOR_CONFIG: undefined
    };

    // Act
    const result = validateEnvironmentVariables(envVars);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should treat empty strings as missing', () => {
    // Arrange
    const envVars: EnvironmentVariables = {
      SALEOR_URL: '',
      SALEOR_TOKEN: 'valid-token',
      SALEOR_CONFIG: undefined
    };
    const requiredVars: Array<keyof EnvironmentVariables> = ['SALEOR_URL', 'SALEOR_TOKEN'];

    // Act
    const result = validateEnvironmentVariables(envVars, requiredVars);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.missing).toEqual(['SALEOR_URL']);
  });
});

describe('getEnvironmentHelpText', () => {
  it('should generate help text with default configuration', () => {
    // Arrange & Act
    const helpText = getEnvironmentHelpText();

    // Assert
    expect(helpText).toContain('🌍 Environment Variables:');
    expect(helpText).toContain('SALEOR_URL - Sets the --url argument');
    expect(helpText).toContain('SALEOR_TOKEN - Sets the --token argument');
    expect(helpText).toContain('SALEOR_CONFIG - Sets the --config argument');
    expect(helpText).toContain('export SALEOR_URL=https://demo.saleor.io/graphql/');
    expect(helpText).toContain('export SALEOR_TOKEN=your-authentication-token');
  });

  it('should generate help text with custom configuration', () => {
    // Arrange
    const config = {
      prefix: 'CUSTOM_',
      mappings: {
        endpoint: 'CUSTOM_ENDPOINT',
        auth: 'CUSTOM_AUTH'
      }
    };

    // Act
    const helpText = getEnvironmentHelpText(config);

    // Assert
    expect(helpText).toContain('🌍 Environment Variables:');
    expect(helpText).toContain('CUSTOM_ENDPOINT - Sets the --endpoint argument');
    expect(helpText).toContain('CUSTOM_AUTH - Sets the --auth argument');
  });

  it('should include examples section', () => {
    // Arrange & Act
    const helpText = getEnvironmentHelpText();

    // Assert
    expect(helpText).toContain('Example:');
    expect(helpText).toContain('export SALEOR_URL=');
    expect(helpText).toContain('export SALEOR_TOKEN=');
  });

  it('should format text with proper line breaks', () => {
    // Arrange & Act
    const helpText = getEnvironmentHelpText();

    // Assert
    const lines = helpText.split('\n');
    expect(lines.length).toBeGreaterThan(5);
    expect(lines[0]).toBe('🌍 Environment Variables:');
    expect(lines[lines.length - 1]).toBe('');
  });
}); 