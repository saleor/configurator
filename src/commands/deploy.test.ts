import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runDeploy } from './deploy';

// Mock dependencies
vi.mock('../cli', () => ({
  parseCliArgs: vi.fn(),
  commandSchemas: { deploy: {} },
  validateSaleorUrl: vi.fn(),
  setupLogger: vi.fn(),
  displayConfig: vi.fn(),
  handleCommandError: vi.fn(),
  confirmPrompt: vi.fn(),
  deploymentConfirmationPrompt: vi.fn(),
  displayDeploymentSummary: vi.fn(),
}));

vi.mock('../core/factory', () => ({
  createConfigurator: vi.fn(),
}));

vi.mock('../lib/utils/file', () => ({
  fileExists: vi.fn(),
}));

describe('Deploy Command', () => {
  let mockConfigurator: any;
  let mockParseCliArgs: any;
  let mockValidateSaleorUrl: any;
  let mockFileExists: any;
  let mockCreateConfigurator: any;
  let mockDeploymentConfirmationPrompt: any;
  let mockDisplayDeploymentSummary: any;
  let consoleSpy: any;
  let processExitSpy: any;

  beforeEach(async () => {
    const cliMocks = vi.mocked(await import('../cli'));
    const factoryMocks = vi.mocked(await import('../core/factory'));
    const fileMocks = vi.mocked(await import('../lib/utils/file'));

    mockParseCliArgs = cliMocks.parseCliArgs;
    mockValidateSaleorUrl = cliMocks.validateSaleorUrl;
    mockDeploymentConfirmationPrompt = cliMocks.deploymentConfirmationPrompt;
    mockDisplayDeploymentSummary = cliMocks.displayDeploymentSummary;
    mockCreateConfigurator = factoryMocks.createConfigurator;
    mockFileExists = fileMocks.fileExists;

    mockConfigurator = {
      diff: vi.fn(),
      push: vi.fn(),
    };

    mockCreateConfigurator.mockReturnValue(mockConfigurator);
    mockValidateSaleorUrl.mockReturnValue('https://valid.url/graphql/');
    mockFileExists.mockReturnValue(true);

    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Deployment Plan Generation', () => {
    it('should generate correct deployment plan with changes', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: false,
        autoApprove: false,
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 5,
        creates: 2,
        updates: 2,
        deletes: 1,
        results: [
          { entityType: 'Channel', entityName: 'test-channel' },
          { entityType: 'Shop', entityName: 'test-shop' },
        ],
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);
      mockDeploymentConfirmationPrompt.mockResolvedValue('proceed');
      mockConfigurator.push.mockResolvedValue(undefined);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async operations

      expect(mockConfigurator.diff).toHaveBeenCalledWith({
        format: 'table',
        filter: undefined,
        quiet: true,
      });

      expect(mockDeploymentConfirmationPrompt).toHaveBeenCalledWith({
        totalChanges: 5,
        creates: 2,
        updates: 2,
        deletes: 1,
        hasDestructiveChanges: true,
        affectedResources: ['Channel: test-channel', 'Shop: test-shop'],
      });

      expect(mockConfigurator.push).toHaveBeenCalled();
      expect(mockDisplayDeploymentSummary).toHaveBeenCalled();
    });

    it('should exit early when no changes detected', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: false,
        autoApprove: false,
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith('✅ No changes detected - configuration is already in sync');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Plan Mode', () => {
    it('should exit after showing plan when --plan flag is used', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: true, // Plan mode enabled
        autoApprove: false,
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 3,
        creates: 1,
        updates: 1,
        deletes: 1,
        results: [],
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith('📋 Plan mode: Showing deployment plan without applying changes\n');
      expect(consoleSpy).toHaveBeenCalledWith('\n📋 Deployment plan complete. Remove --plan or --dry-run to apply changes.');
      expect(processExitSpy).toHaveBeenCalledWith(0);
      expect(mockConfigurator.push).not.toHaveBeenCalled();
    });
  });

  describe('Auto-approve Mode', () => {
    it('should skip confirmation when --auto-approve is used', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: false,
        autoApprove: true, // Auto-approve enabled
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 2,
        creates: 2,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);
      mockConfigurator.push.mockResolvedValue(undefined);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(consoleSpy).toHaveBeenCalledWith('⚡ Auto-approve enabled: Changes will be applied automatically\n');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ Auto-approving deployment...');
      expect(mockDeploymentConfirmationPrompt).not.toHaveBeenCalled();
      expect(mockConfigurator.push).toHaveBeenCalled();
    });
  });

  describe('Target Filtering', () => {
    it('should pass target filter to diff operation', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: true,
        autoApprove: false,
        target: 'channels,shop', // Target specific resources
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [],
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockConfigurator.diff).toHaveBeenCalledWith({
        format: 'table',
        filter: ['channels', 'shop'],
        quiet: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should display deployment summary with errors when push fails', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: false,
        autoApprove: true,
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      const mockDiffSummary = {
        totalChanges: 1,
        creates: 1,
        updates: 0,
        deletes: 0,
        results: [],
      };

      const pushError = new Error('Network error during push');

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockConfigurator.diff.mockResolvedValue(mockDiffSummary);
      mockConfigurator.push.mockRejectedValue(pushError);

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockDisplayDeploymentSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: ['Network error during push'],
        })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should exit with error when config file does not exist', async () => {
      // Arrange
      const mockArgs = {
        url: 'https://test.com/graphql/',
        token: 'test-token',
        config: 'missing-config.yml',
        quiet: false,
        verbose: false,
        dryRun: false,
        force: false,
        plan: false,
        autoApprove: false,
        target: undefined,
        diff: true,
        continueOnError: false,
        parallelism: 3,
        refreshOnly: false,
      };

      mockParseCliArgs.mockReturnValue(mockArgs);
      mockFileExists.mockReturnValue(false); // Config file doesn't exist

      // Act & Assert
      expect(() => runDeploy()).rejects.toThrow('Process exit called');
      
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(console.error).toHaveBeenCalledWith('❌ Configuration file not found: missing-config.yml');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
}); 