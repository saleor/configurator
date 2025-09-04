import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
// Import cliConsole so we can mock it
import { cliConsole } from "../cli/console";
import * as configuratorModule from "../core/configurator";
import * as deploymentModule from "../core/deployment";
import { NetworkDeploymentError } from "../core/deployment/errors";
import { ConfigurationValidationError } from "../core/errors/configuration-errors";
import { logger } from "../lib/logger";
import { deployHandler } from "./deploy";

// Mock modules
vi.mock("../cli/console");
vi.mock("../cli/command", () => ({
  baseCommandArgsSchema: {
    extend: vi.fn().mockReturnValue({
      parse: vi.fn().mockReturnValue({}),
    }),
  },
  confirmAction: vi.fn().mockResolvedValue(true),
}));
vi.mock("../lib/logger");
vi.mock("../core/deployment");
vi.mock("../core/deployment/enhanced-pipeline", () => ({
  executeEnhancedDeployment: vi.fn(),
}));
vi.mock("../core/deployment/results", () => ({
  DeploymentResultFormatter: vi.fn(() => ({
    format: vi.fn().mockReturnValue("Mock deployment result"),
  })),
}));
vi.mock("../core/diff/formatters", () => ({
  DeployDiffFormatter: vi.fn(() => ({
    format: vi.fn().mockReturnValue("Mock diff output"),
  })),
  DetailedDiffFormatter: vi.fn(() => ({
    format: vi.fn().mockReturnValue("Mock detailed diff output"),
  })),
  SummaryDiffFormatter: vi.fn(() => ({
    format: vi.fn().mockReturnValue("Mock summary diff output"),
  })),
}));

describe("Deploy Command", () => {
  let mockCreateConfigurator: ReturnType<typeof vi.fn>;
  let mockExit: MockInstance<(code?: string | number | null) => never>;
  let mockDeploymentPipeline: {
    addStage: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  };
  let mockExecuteEnhancedDeployment: ReturnType<typeof vi.fn>;
  let mockDiffService: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    // Mock process.exit
    mockExit = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit(${code})`);
    }) as never);

    // Mock logger to suppress output
    vi.spyOn(logger, "error").mockImplementation(() => undefined);

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock diff service
    mockDiffService = {
      diffForDeployWithFormatting: vi.fn().mockResolvedValue({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [],
        },
        output: "",
      }),
    };

    // Mock deployment pipeline
    mockDeploymentPipeline = {
      addStage: vi.fn(),
      execute: vi.fn().mockResolvedValue({
        startTime: new Date(),
        endTime: new Date(),
        totalDuration: 100,
        stageMetrics: [],
        operationCounts: { created: 1, updated: 0, deleted: 0 },
        errors: [],
      }),
    };

    vi.spyOn(deploymentModule, "DeploymentPipeline").mockImplementation(
      () =>
        mockDeploymentPipeline as unknown as InstanceType<
          typeof deploymentModule.DeploymentPipeline
        >
    );

    // Setup executeEnhancedDeployment mock
    const { executeEnhancedDeployment } = await import("../core/deployment/enhanced-pipeline");
    mockExecuteEnhancedDeployment = vi.mocked(executeEnhancedDeployment);
    mockExecuteEnhancedDeployment.mockImplementation(async () => {
      const result = {
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        duration: 100,
        stageDurations: new Map(),
        stageMetrics: [],
        operationCounts: { created: 1, updated: 0, deleted: 0 },
        errors: [],
      },
      result: {
        overallStatus: 'success' as const,
        stages: [],
        totalOperations: 1,
        successfulOperations: 1,
        failedOperations: 0,
      },
      shouldExit: true,
      exitCode: 0,
      };
      return result;
    });
    vi.spyOn(deploymentModule, "getAllStages").mockReturnValue([]);
    vi.spyOn(deploymentModule, "DeploymentSummaryReport").mockImplementation(
      () =>
        ({
          display: vi.fn(),
        }) as unknown as InstanceType<typeof deploymentModule.DeploymentSummaryReport>
    );
    vi.spyOn(deploymentModule, "DeploymentReportGenerator").mockImplementation(
      () =>
        ({
          saveToFile: vi.fn(),
        }) as unknown as InstanceType<typeof deploymentModule.DeploymentReportGenerator>
    );

    // Mock configurator with all required methods
    const mockConfigurator = {
      services: {
        diffService: mockDiffService,
        configStorage: {
          load: vi.fn().mockResolvedValue({}),
        },
        configuration: {
          retrieveWithoutSaving: vi.fn().mockResolvedValue({}),
        },
      },
      diff: vi.fn().mockResolvedValue({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [],
        },
        output: "",
      }),
    };

    mockCreateConfigurator = vi.fn().mockReturnValue(mockConfigurator);

    vi.spyOn(configuratorModule, "createConfigurator").mockImplementation(mockCreateConfigurator);

    // confirmAction is already mocked at module level

    // Mock the progress methods that are used in the diff() method
    if (!vi.mocked(cliConsole).progress) {
      vi.mocked(cliConsole).progress = {} as typeof cliConsole.progress;
    }
    vi.mocked(cliConsole).progress.start = vi.fn();
    vi.mocked(cliConsole).progress.update = vi.fn();
    vi.mocked(cliConsole).progress.succeed = vi.fn();
    vi.mocked(cliConsole).progress.fail = vi.fn();
    vi.mocked(cliConsole).progress.info = vi.fn();
    vi.mocked(cliConsole).progress.warn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error handling", () => {
    it("should handle network errors with exit code 3", async () => {
      const networkError = new Error("fetch failed");

      // Mock the configurator's diff method to throw network error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(networkError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(3)");

      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should handle authentication errors with exit code 2", async () => {
      const authError = new Error("unauthorized");

      // Mock the configurator's diff method to throw auth error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(authError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "invalid-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(2)");

      expect(mockExit).toHaveBeenCalledWith(2);
    });

    it("should handle configuration validation errors with exit code 4", async () => {
      const validationError = new ConfigurationValidationError(
        "Configuration validation failed",
        "config.yml",
        [
          { path: "channels.0.name", message: "Field is required" },
          { path: "shop.email", message: "Invalid email format" },
        ]
      );

      // Mock the configurator's diff method to throw validation error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(validationError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(4)");

      expect(mockExit).toHaveBeenCalledWith(4);
    });

    it("should handle DeploymentError instances directly", async () => {
      const deploymentError = new NetworkDeploymentError("Failed to connect to Saleor", {
        url: "https://test.saleor.cloud",
        timeout: 30000,
      });

      // Mock the configurator's diff method to throw deployment error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(deploymentError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(3)");

      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should show verbose error details when verbose flag is set", async () => {
      const networkError = new Error("econnrefused");

      // Mock the configurator's diff method to throw network error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(networkError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: true,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(3)");

      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should handle unexpected errors with exit code 1", async () => {
      const unexpectedError = new Error("Unexpected internal error");
      mockExecuteEnhancedDeployment.mockRejectedValue(unexpectedError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(1)");

      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle errors during diff analysis", async () => {
      const diffError = new Error("Invalid configuration structure");

      // Mock the configurator's diff method to throw error
      const mockConfiguratorWithError = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockRejectedValue(diffError),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorWithError);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(4)");

      expect(mockExit).toHaveBeenCalledWith(4);
    });
  });

  describe("Successful deployment", () => {
    it("should exit gracefully when no changes detected", async () => {
      // Mock no changes scenario
      const mockConfiguratorNoChanges = {
        services: {
          diffService: mockDiffService,
          configStorage: {
            load: vi.fn().mockResolvedValue({}),
          },
          configuration: {
            retrieveWithoutSaving: vi.fn().mockResolvedValue({}),
          },
        },
        diff: vi.fn().mockResolvedValue({
          summary: {
            totalChanges: 0,
            creates: 0,
            updates: 0,
            deletes: 0,
            results: [],
          },
          output: "",
        }),
      };

      mockCreateConfigurator.mockReturnValue(mockConfiguratorNoChanges);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      // Should not throw any error and should not call process.exit
      await deployHandler(args);

      expect(mockCreateConfigurator).toHaveBeenCalledWith(args);
      expect(mockDeploymentPipeline.execute).not.toHaveBeenCalled();
      expect(mockExit).not.toHaveBeenCalled();
    });

    it("should complete deployment successfully", async () => {
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      // The deployment will succeed with exit code 0
      await expect(deployHandler(args)).rejects.toThrow("process.exit(0)");

      // Verify that the deployment pipeline was executed
      expect(mockCreateConfigurator).toHaveBeenCalledWith(args);
      expect(mockExecuteEnhancedDeployment).toHaveBeenCalled();
      // And that exit(0) was called for successful deployment
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should skip confirmation in CI mode", async () => {
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(0)");

      // In CI mode, confirmAction should not be called because args.ci is true
      const { confirmAction } = await import("../cli/command");
      expect(confirmAction).not.toHaveBeenCalled();
      expect(mockExecuteEnhancedDeployment).toHaveBeenCalled();
    });

    it("should save deployment report", async () => {
      const mockReportGenerator = {
        saveToFile: vi.fn(),
      };

      vi.spyOn(deploymentModule, "DeploymentReportGenerator").mockImplementation(
        () =>
          mockReportGenerator as unknown as InstanceType<
            typeof deploymentModule.DeploymentReportGenerator
          >
      );

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: true,
        quiet: false,
        verbose: false,
        reportPath: "custom-report.json",
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(0)");

      expect(mockReportGenerator.saveToFile).toHaveBeenCalledWith("custom-report.json");
    });
  });

  describe("User confirmation", () => {
    it("should exit gracefully when user cancels", async () => {
      // Mock confirmAction to return false for this specific test
      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValueOnce(false);

      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        ci: false,
        quiet: false,
        verbose: false,
      };

      await expect(deployHandler(args)).rejects.toThrow("process.exit(0)");

      expect(mockExecuteEnhancedDeployment).not.toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
