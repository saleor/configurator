import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { parseCliArgs } from './cli-args';

describe('cli-args utils', () => {
  let originalArgv: string[];
  let exitSpy: any;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;

  beforeEach(() => {
    originalArgv = process.argv;
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = originalArgv;
    vi.restoreAllMocks();
  });

  const testSchema = z.object({
    url: z.string(),
    token: z.string(),
    config: z.string().default('config.yml'),
    quiet: z.boolean().default(false),
    verbose: z.boolean().default(false),
    force: z.boolean().default(false),
    dryRun: z.boolean().default(false),
    skipValidation: z.boolean().default(false),
  });

  describe('successful parsing', () => {
    it('should parse required arguments correctly', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url=https://test.saleor.cloud/graphql/',
        '--token=test-token'
      ];

      // Act
      const result = parseCliArgs(testSchema, 'test');

      // Assert
      expect(result.url).toBe('https://test.saleor.cloud/graphql/');
      expect(result.token).toBe('test-token');
      expect(result.config).toBe('config.yml');
      expect(result.quiet).toBe(false);
      expect(result.verbose).toBe(false);
      expect(result.force).toBe(false);
      expect(result.dryRun).toBe(false);
      expect(result.skipValidation).toBe(false);
    });

    it('should parse boolean flags correctly', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url=https://custom.saleor.cloud/graphql/',
        '--token=custom-token',
        '--config=custom-config.yml',
        '--quiet',
        '--verbose',
        '--force'
      ];

      // Act
      const result = parseCliArgs(testSchema, 'test');

      // Assert
      expect(result.url).toBe('https://custom.saleor.cloud/graphql/');
      expect(result.token).toBe('custom-token');
      expect(result.config).toBe('custom-config.yml');
      expect(result.quiet).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.force).toBe(true);
    });

    it('should handle different argument formats', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url', 'https://test.saleor.cloud/graphql/',
        '--token', 'test-token',
        '--config', 'my-config.yml'
      ];

      // Act
      const result = parseCliArgs(testSchema, 'test');

      // Assert
      expect(result.url).toBe('https://test.saleor.cloud/graphql/');
      expect(result.token).toBe('test-token');
      expect(result.config).toBe('my-config.yml');
    });

    it('should use environment variables as fallback', () => {
      // Arrange
      process.env.SALEOR_URL = 'https://env.saleor.cloud/graphql/';
      process.env.SALEOR_TOKEN = 'env-token';
      process.argv = ['node', 'script.js'];

      // Act
      const result = parseCliArgs(testSchema, 'test');

      // Assert
      expect(result.url).toBe('https://env.saleor.cloud/graphql/');
      expect(result.token).toBe('env-token');

      // Cleanup
      delete process.env.SALEOR_URL;
      delete process.env.SALEOR_TOKEN;
    });

    it('should prioritize command line arguments over environment variables', () => {
      // Arrange
      process.env.SALEOR_URL = 'https://env.saleor.cloud/graphql/';
      process.env.SALEOR_TOKEN = 'env-token';
      process.argv = [
        'node',
        'script.js',
        '--url=https://cli.saleor.cloud/graphql/',
        '--token=cli-token'
      ];

      // Act
      const result = parseCliArgs(testSchema, 'test');

      // Assert
      expect(result.url).toBe('https://cli.saleor.cloud/graphql/');
      expect(result.token).toBe('cli-token');

      // Cleanup
      delete process.env.SALEOR_URL;
      delete process.env.SALEOR_TOKEN;
    });
  });

  describe('error handling', () => {
    it('should exit with error when missing required arguments', () => {
      // Arrange
      process.argv = ['node', 'script.js'];

      // Act
      try {
        parseCliArgs(testSchema, 'test');
      } catch (error) {
        // Expected to throw or exit
      }

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid arguments provided:\n');
    });

    it('should exit with error when URL is missing', () => {
      // Arrange
      process.argv = ['node', 'script.js', '--token=test-token'];

      // Act
      try {
        parseCliArgs(testSchema, 'test');
      } catch (error) {
        // Expected to throw or exit
      }

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Required'));
    });

    it('should exit with error when token is missing', () => {
      // Arrange
      process.argv = ['node', 'script.js', '--url=https://test.com'];

      // Act
      try {
        parseCliArgs(testSchema, 'test');
      } catch (error) {
        // Expected to throw or exit
      }

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Required'));
    });
  });

  describe('help functionality', () => {
    it('should exit when help flag is provided', () => {
      // Arrange
      process.argv = ['node', 'script.js', '--help'];

      // Act
      try {
        parseCliArgs(testSchema, 'test');
      } catch (error) {
        // Expected to throw or exit
      }

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TEST Command Help'));
    });

    it('should exit when -h flag is provided', () => {
      // Arrange
      process.argv = ['node', 'script.js', '-h'];

      // Act
      try {
        parseCliArgs(testSchema, 'test');
      } catch (error) {
        // Expected to throw or exit
      }

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('TEST Command Help'));
    });
  });

  describe('diff command specific arguments', () => {
    const diffSchema = z.object({
      url: z.string(),
      token: z.string(),
      config: z.string().default('config.yml'),
      format: z.enum(['table', 'json']).default('table'),
      quiet: z.boolean().default(false),
      verbose: z.boolean().default(false),
    });

    it('should parse diff-specific flags', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url=https://test.saleor.cloud/graphql/',
        '--token=test-token',
        '--format=json'
      ];

      // Act
      const result = parseCliArgs(diffSchema, 'diff');

      // Assert
      expect(result.format).toBe('json');
    });

    it('should default to table format', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url=https://test.saleor.cloud/graphql/',
        '--token=test-token'
      ];

      // Act
      const result = parseCliArgs(diffSchema, 'diff');

      // Assert
      expect(result.format).toBe('table');
    });
  });

  describe('push command specific arguments', () => {
    const pushSchema = z.object({
      url: z.string(),
      token: z.string(),
      config: z.string().default('config.yml'),
      quiet: z.boolean().default(false),
      verbose: z.boolean().default(false),
      force: z.boolean().default(false),
    });

    it('should parse push-specific flags', () => {
      // Arrange
      process.argv = [
        'node',
        'script.js',
        '--url=https://test.saleor.cloud/graphql/',
        '--token=test-token',
        '--force'
      ];

      // Act
      const result = parseCliArgs(pushSchema, 'push');

      // Assert
      expect(result.force).toBe(true);
    });
  });
}); 