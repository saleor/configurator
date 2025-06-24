import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { 
  validateSaleorUrl, 
  handleErrorDisplay, 
  setupLogger, 
  displayConfig, 
  createBackup, 
  fileExists,
  createBackupPath,
  handleCommandError
} from './command-utils';

// Mock fs
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('command-utils', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateSaleorUrl', () => {
    it('should return URL unchanged when it already includes /graphql/', () => {
      // Arrange
      const url = 'https://store.saleor.cloud/graphql/';

      // Act
      const result = validateSaleorUrl(url, true);

      // Assert
      expect(result).toBe(url);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should return URL unchanged when it includes /graphql (without trailing slash)', () => {
      // Arrange
      const url = 'https://store.saleor.cloud/graphql';

      // Act
      const result = validateSaleorUrl(url, true);

      // Assert
      expect(result).toBe(url);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should add /graphql/ to URL ending with slash and show warning when not quiet', () => {
      // Arrange
      const url = 'https://store.saleor.cloud/';

      // Act
      const result = validateSaleorUrl(url, false);

      // Assert
      expect(result).toBe('https://store.saleor.cloud/graphql/');
      expect(consoleWarnSpy).toHaveBeenCalledWith('\n⚠️  Warning: URL missing GraphQL endpoint');
      expect(consoleWarnSpy).toHaveBeenCalledWith('   Original: https://store.saleor.cloud/');
      expect(consoleWarnSpy).toHaveBeenCalledWith('   Using: https://store.saleor.cloud/graphql/\n');
    });

    it('should add /graphql/ to URL not ending with slash', () => {
      // Arrange
      const url = 'https://store.saleor.cloud';

      // Act
      const result = validateSaleorUrl(url, false);

      // Assert
      expect(result).toBe('https://store.saleor.cloud/graphql/');
    });

    it('should not show warning when quiet mode is enabled', () => {
      // Arrange
      const url = 'https://store.saleor.cloud';

      // Act
      const result = validateSaleorUrl(url, true);

      // Assert
      expect(result).toBe('https://store.saleor.cloud/graphql/');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should throw error for invalid URL format', () => {
      // Arrange
      const invalidUrl = 'not-a-url';

      // Act & Assert
      expect(() => validateSaleorUrl(invalidUrl)).toThrow('Invalid URL format: not-a-url');
    });
  });

  describe('handleErrorDisplay', () => {
    it('should display detailed message for forbidden errors', () => {
      // Arrange
      const error = new Error('GraphQL Error: Forbidden (403)\n\nDetailed message about forbidden access');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ GraphQL Error: Forbidden (403)\n\nDetailed message about forbidden access');
    });

    it('should display detailed message for not found errors', () => {
      // Arrange
      const error = new Error('GraphQL Error: Not Found (404)\n\nDetailed message about not found');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ GraphQL Error: Not Found (404)\n\nDetailed message about not found');
    });

    it('should display detailed message for connection failed errors', () => {
      // Arrange
      const error = new Error('GraphQL Error: Connection Failed\n\nDetailed message about connection');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ GraphQL Error: Connection Failed\n\nDetailed message about connection');
    });

    it('should display detailed message for unauthorized errors', () => {
      // Arrange
      const error = new Error('GraphQL Error: Unauthorized (401)\n\nDetailed message about auth');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ GraphQL Error: Unauthorized (401)\n\nDetailed message about auth');
    });

    it('should display config error message with tip', () => {
      // Arrange
      const error = new Error('ENOENT config file not found');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Error: ENOENT config file not found');
      expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Make sure the config directory is writable');
    });

    it('should display network error message with tip', () => {
      // Arrange
      const error = new Error('Network fetch failed');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Error: Network fetch failed');
      expect(consoleErrorSpy).toHaveBeenCalledWith('💡 Check your Saleor URL and network connection');
    });

    it('should display generic error message for unknown errors', () => {
      // Arrange
      const error = new Error('Some unknown error');

      // Act
      handleErrorDisplay(error);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ Error: Some unknown error');
    });
  });

  describe('setupLogger', () => {
    it('should set debug level when verbose is true', () => {
      // Arrange
      delete process.env.LOG_LEVEL;

      // Act
      setupLogger(true, false);

      // Assert
      expect(process.env.LOG_LEVEL).toBe('debug');
    });

    it('should set error level when quiet is true', () => {
      // Arrange
      delete process.env.LOG_LEVEL;

      // Act
      setupLogger(false, true);

      // Assert
      expect(process.env.LOG_LEVEL).toBe('error');
    });

    it('should not set log level when both flags are false', () => {
      // Arrange
      delete process.env.LOG_LEVEL;

      // Act
      setupLogger(false, false);

      // Assert
      expect(process.env.LOG_LEVEL).toBeUndefined();
    });

    it('should prioritize verbose over quiet', () => {
      // Arrange
      delete process.env.LOG_LEVEL;

      // Act
      setupLogger(true, true);

      // Assert
      expect(process.env.LOG_LEVEL).toBe('debug');
    });
  });

  describe('displayConfig', () => {
    it('should display basic configuration when not quiet', () => {
      // Arrange
      const args = {
        url: 'https://store.saleor.cloud/graphql/',
        token: 'token123',
        config: 'config.yml',
        quiet: false,
        verbose: false,
      };

      // Act
      displayConfig(args, false);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('📋 Configuration:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   URL: https://store.saleor.cloud/graphql/');
      expect(consoleLogSpy).toHaveBeenCalledWith('   Config: config.yml');
      expect(consoleLogSpy).toHaveBeenCalledWith('');
    });

    it('should display additional arguments', () => {
      // Arrange
      const args = {
        url: 'https://store.saleor.cloud/graphql/',
        token: 'token123',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        format: 'json',
        filter: 'channels,shop',
      };

      // Act
      displayConfig(args, false);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('   Format: json');
      expect(consoleLogSpy).toHaveBeenCalledWith('   Filter: channels,shop');
    });

    it('should not display configuration when quiet', () => {
      // Arrange
      const args = {
        url: 'https://store.saleor.cloud/graphql/',
        token: 'token123',
        config: 'config.yml',
        quiet: false,
        verbose: false,
      };

      // Act
      displayConfig(args, true);

      // Assert
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not display excluded fields', () => {
      // Arrange
      const args = {
        url: 'https://store.saleor.cloud/graphql/',
        token: 'token123',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        someOtherField: 'value',
      };

      // Act
      displayConfig(args, false);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('   SomeOtherField: value');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('token'));
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);

      // Act
      const result = fileExists('config.yml');

      // Assert
      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith('config.yml');
    });

    it('should return false when file does not exist', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = fileExists('config.yml');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when fs.existsSync throws error', () => {
      // Arrange
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Act
      const result = fileExists('config.yml');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createBackup', () => {
    beforeEach(() => {
      // Mock fs.promises
      mockFs.promises = {
        copyFile: vi.fn(),
      } as any;
    });

    it('should create backup successfully', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.promises.copyFile as any).mockResolvedValue(undefined);
      
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = await createBackup('config.yml');

      // Assert
      expect(result).toBe('config.backup.2024-06-24T18-30-45-123Z.yml');
      expect(mockFs.promises.copyFile).toHaveBeenCalledWith(
        'config.yml', 
        'config.backup.2024-06-24T18-30-45-123Z.yml'
      );
    });

    it('should return null when file does not exist', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = await createBackup('config.yml');

      // Assert
      expect(result).toBeNull();
      expect(mockFs.promises.copyFile).not.toHaveBeenCalled();
    });

    it('should return null and log warning when copy fails', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);
      (mockFs.promises.copyFile as any).mockRejectedValue(new Error('Permission denied'));

      const { logger } = await import('../logger');

      // Act
      const result = await createBackup('config.yml');

      // Assert
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith('Failed to create backup of config.yml', { 
        error: expect.any(Error) 
      });
    });
  });

  describe('createBackupPath', () => {
    it('should create backup path with timestamp', () => {
      // Arrange
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = createBackupPath('config.yml');

      // Assert
      expect(result).toBe('config.backup.2024-06-24T18-30-45-123Z.yml');
    });
  });

  describe('handleCommandError', () => {
    it('should handle Error instances', () => {
      // Arrange
      const error = new Error('Test error');
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      
      // Act
      handleCommandError(error, 'Test');

      // Assert
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle non-Error instances', () => {
      // Arrange
      const error = 'String error';
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      // Act
      handleCommandError(error, 'Test');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n❌ An unexpected error occurred');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
}); 