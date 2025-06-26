import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateSaleorUrl, validateConfigPath, validateFormat } from './index';

describe('CLI Validation', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
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

  describe('validateConfigPath', () => {
    it('should return true for valid config paths', () => {
      // Arrange & Act & Assert
      expect(validateConfigPath('config.yml')).toBe(true);
      expect(validateConfigPath('path/to/config.yaml')).toBe(true);
      expect(validateConfigPath('/absolute/path/config.yml')).toBe(true);
    });

    it('should return false for empty paths', () => {
      // Arrange & Act & Assert
      expect(validateConfigPath('')).toBe(false);
    });

    it('should return false for paths with null characters', () => {
      // Arrange & Act & Assert
      expect(validateConfigPath('config\0.yml')).toBe(false);
    });
  });

  describe('validateFormat', () => {
    it('should return true for valid formats', () => {
      // Arrange
      const allowedFormats = ['table', 'json', 'summary'];

      // Act & Assert
      expect(validateFormat('table', allowedFormats)).toBe(true);
      expect(validateFormat('json', allowedFormats)).toBe(true);
      expect(validateFormat('summary', allowedFormats)).toBe(true);
    });

    it('should return false for invalid formats', () => {
      // Arrange
      const allowedFormats = ['table', 'json', 'summary'];

      // Act & Assert
      expect(validateFormat('xml', allowedFormats)).toBe(false);
      expect(validateFormat('csv', allowedFormats)).toBe(false);
      expect(validateFormat('', allowedFormats)).toBe(false);
    });
  });
}); 