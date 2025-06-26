import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { 
  fileExists, 
  createBackupPath, 
  createBackup, 
  ensureDirectory, 
  readFile, 
  writeFile 
} from './file';

// Mock fs
vi.mock('fs');
const mockFs = vi.mocked(fs);

// Mock logger
vi.mock('../logger', () => ({
  logger: {
    warn: vi.fn(),
  }
}));

describe('File Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(true);

      // Act
      const result = fileExists('test.txt');

      // Assert
      expect(result).toBe(true);
      expect(mockFs.existsSync).toHaveBeenCalledWith('test.txt');
    });

    it('should return false when file does not exist', () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = fileExists('nonexistent.txt');

      // Assert
      expect(result).toBe(false);
      expect(mockFs.existsSync).toHaveBeenCalledWith('nonexistent.txt');
    });

    it('should return false when fs.existsSync throws an error', () => {
      // Arrange
      mockFs.existsSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // Act
      const result = fileExists('test.txt');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('createBackupPath', () => {
    it('should create backup path with timestamp for simple filename', () => {
      // Arrange
      const originalPath = 'config.yml';
      const mockDate = new Date('2023-12-01T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('config.backup.2023-12-01T10-30-00-000Z.yml');
    });

    it('should create backup path for file with multiple dots', () => {
      // Arrange
      const originalPath = 'my.config.file.yaml';
      const mockDate = new Date('2023-12-01T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('my.config.file.backup.2023-12-01T10-30-00-000Z.yaml');
    });

    it('should handle file with no extension', () => {
      // Arrange
      const originalPath = 'configfile';
      const mockDate = new Date('2023-12-01T10:30:00.000Z');
      vi.setSystemTime(mockDate);

      // Act
      const result = createBackupPath(originalPath);

      // Assert
      expect(result).toBe('.backup.2023-12-01T10-30-00-000Z.configfile');
    });
  });

  describe('createBackup', () => {
    it('should create backup when file exists', async () => {
      // Arrange
      const filePath = 'config.yml';
      const mockDate = new Date('2023-12-01T10:30:00.000Z');
      vi.setSystemTime(mockDate);
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.copyFile = vi.fn().mockResolvedValue(undefined);

      // Act
      const result = await createBackup(filePath);

      // Assert
      expect(result).toBe('config.backup.2023-12-01T10-30-00-000Z.yml');
      expect(mockFs.promises.copyFile).toHaveBeenCalledWith(
        'config.yml',
        'config.backup.2023-12-01T10-30-00-000Z.yml'
      );
    });

    it('should return null when file does not exist', async () => {
      // Arrange
      mockFs.existsSync.mockReturnValue(false);

      // Act
      const result = await createBackup('nonexistent.yml');

      // Assert
      expect(result).toBe(null);
      expect(mockFs.promises.copyFile).not.toHaveBeenCalled();
    });

    it('should return null and log warning when backup fails', async () => {
      // Arrange
      const filePath = 'config.yml';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.copyFile = vi.fn().mockRejectedValue(new Error('Permission denied'));

      // Act
      const result = await createBackup(filePath);

      // Assert
      expect(result).toBe(null);
    });
  });

  describe('ensureDirectory', () => {
    it('should create directory recursively', async () => {
      // Arrange
      const dirPath = 'path/to/directory';
      mockFs.promises.mkdir = vi.fn().mockResolvedValue(undefined);

      // Act
      await ensureDirectory(dirPath);

      // Assert
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(dirPath, { recursive: true });
    });

    it('should not throw when directory already exists', async () => {
      // Arrange
      const dirPath = 'existing/directory';
      const existsError = new Error('Directory exists') as any;
      existsError.code = 'EEXIST';
      mockFs.promises.mkdir = vi.fn().mockRejectedValue(existsError);

      // Act & Assert
      await expect(ensureDirectory(dirPath)).resolves.not.toThrow();
    });

    it('should throw for other filesystem errors', async () => {
      // Arrange
      const dirPath = 'path/to/directory';
      const permissionError = new Error('Permission denied') as any;
      permissionError.code = 'EACCES';
      mockFs.promises.mkdir = vi.fn().mockRejectedValue(permissionError);

      // Act & Assert
      await expect(ensureDirectory(dirPath)).rejects.toThrow('Permission denied');
    });
  });

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      // Arrange
      const filePath = 'test.txt';
      const content = 'Hello, World!';
      mockFs.promises.readFile = vi.fn().mockResolvedValue(content);

      // Act
      const result = await readFile(filePath);

      // Assert
      expect(result).toBe(content);
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });

    it('should throw formatted error when reading fails', async () => {
      // Arrange
      const filePath = 'nonexistent.txt';
      const originalError = new Error('File not found');
      mockFs.promises.readFile = vi.fn().mockRejectedValue(originalError);

      // Act & Assert
      await expect(readFile(filePath)).rejects.toThrow('Failed to read file nonexistent.txt: File not found');
    });
  });

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      // Arrange
      const filePath = 'output.txt';
      const content = 'Hello, World!';
      mockFs.promises.writeFile = vi.fn().mockResolvedValue(undefined);

      // Act
      await writeFile(filePath, content);

      // Assert
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(filePath, content, 'utf-8');
    });

    it('should throw formatted error when writing fails', async () => {
      // Arrange
      const filePath = 'readonly.txt';
      const content = 'Hello, World!';
      const originalError = new Error('Permission denied');
      mockFs.promises.writeFile = vi.fn().mockRejectedValue(originalError);

      // Act & Assert
      await expect(writeFile(filePath, content)).rejects.toThrow('Failed to write file readonly.txt: Permission denied');
    });
  });
}); 