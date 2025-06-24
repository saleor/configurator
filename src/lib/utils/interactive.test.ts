import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as readline from 'readline';
import { confirmPrompt, selectPrompt, displayDiffSummary, createBackupPath } from './interactive';

// Mock readline
vi.mock('readline');
const mockReadline = vi.mocked(readline);

describe('interactive utils', () => {
  let mockInterface: any;
  let consoleLogSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Mock readline interface
    mockInterface = {
      question: vi.fn(),
      close: vi.fn(),
    };
    mockReadline.createInterface.mockReturnValue(mockInterface);

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('confirmPrompt', () => {
    it('should return true when user enters "y"', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('y');
      });

      // Act
      const result = await confirmPrompt('Continue?');

      // Assert
      expect(result).toBe(true);
      expect(mockInterface.question).toHaveBeenCalledWith('Continue? [y/N]: ', expect.any(Function));
      expect(mockInterface.close).toHaveBeenCalled();
    });

    it('should return false when user enters "n"', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('n');
      });

      // Act
      const result = await confirmPrompt('Continue?');

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when user enters "yes"', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('yes');
      });

      // Act
      const result = await confirmPrompt('Continue?');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when user enters "no"', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('no');
      });

      // Act
      const result = await confirmPrompt('Continue?');

      // Assert
      expect(result).toBe(false);
    });

    it('should return default value when user enters empty string', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('');
      });

      // Act
      const result = await confirmPrompt('Continue?', true);

      // Assert
      expect(result).toBe(true);
      expect(mockInterface.question).toHaveBeenCalledWith('Continue? [Y/n]: ', expect.any(Function));
    });

    it('should return default value when user enters invalid input', async () => {
      // Arrange
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('invalid');
      });

      // Act
      const result = await confirmPrompt('Continue?', true);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('selectPrompt', () => {
    it('should return selected choice when valid number is entered', async () => {
      // Arrange
      const choices = ['Option 1', 'Option 2', 'Option 3'];
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('2');
      });

      // Act
      const result = await selectPrompt('Choose an option:', choices);

      // Assert
      expect(result).toBe('Option 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('\nChoose an option:');
      expect(consoleLogSpy).toHaveBeenCalledWith('  1. Option 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('  2. Option 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('  3. Option 3');
    });

    it('should return first choice when invalid number is entered', async () => {
      // Arrange
      const choices = ['Option 1', 'Option 2'];
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('5');
      });

      // Act
      const result = await selectPrompt('Choose an option:', choices);

      // Assert
      expect(result).toBe('Option 1');
    });

    it('should return first choice when non-number is entered', async () => {
      // Arrange
      const choices = ['Option 1', 'Option 2'];
      mockInterface.question.mockImplementation((question: string, callback: Function) => {
        callback('invalid');
      });

      // Act
      const result = await selectPrompt('Choose an option:', choices);

      // Assert
      expect(result).toBe('Option 1');
    });
  });

  describe('displayDiffSummary', () => {
    it('should display no changes message when totalChanges is 0', () => {
      // Arrange
      const summary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('\n✅ No differences found - configurations are already in sync');
    });

    it('should display diff summary with all change types', () => {
      // Arrange
      const summary = {
        totalChanges: 6,
        creates: 2,
        updates: 3,
        deletes: 1,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('\n📊 Configuration Differences Summary:');
      expect(consoleLogSpy).toHaveBeenCalledWith('   Total Changes: 6');
      expect(consoleLogSpy).toHaveBeenCalledWith('   🟢 Creates: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('   🟡 Updates: 3');
      expect(consoleLogSpy).toHaveBeenCalledWith('   🔴 Deletes: 1');
    });

    it('should display only relevant change types', () => {
      // Arrange
      const summary = {
        totalChanges: 2,
        creates: 2,
        updates: 0,
        deletes: 0,
      };

      // Act
      displayDiffSummary(summary);

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('   Total Changes: 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('   🟢 Creates: 2');
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Updates'));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Deletes'));
    });
  });

  describe('createBackupPath', () => {
    it('should create backup path with timestamp for file with extension', () => {
      // Arrange
      const originalPath = 'config.yml';
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('config.backup.2024-06-24T18-30-45-123Z.yml');
    });

    it('should create backup path for file without extension', () => {
      // Arrange
      const originalPath = 'config';
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('.backup.2024-06-24T18-30-45-123Z.config');
    });

    it('should handle file with multiple dots in name', () => {
      // Arrange
      const originalPath = 'my.config.backup.yml';
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('my.config.backup.backup.2024-06-24T18-30-45-123Z.yml');
    });

    it('should handle path with directory', () => {
      // Arrange
      const originalPath = '/path/to/config.yml';
      const mockDate = new Date('2024-06-24T18:30:45.123Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('/path/to/config.backup.2024-06-24T18-30-45-123Z.yml');
    });
  });
}); 