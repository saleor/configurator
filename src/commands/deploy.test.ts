import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import { cliConsole } from "../cli/console";
import * as configuratorModule from "../core/configurator";
import * as deploymentModule from "../core/deployment";
import { NetworkDeploymentError } from "../core/deployment/errors";
import { ConfigurationValidationError } from "../core/errors/configuration-errors";
import { logger } from "../lib/logger";
import { deployHandler } from "./deploy";

vi.mock("../core/deployment/report-storage", () => ({
  resolveReportPath: vi.fn(async (customPath?: string) => {
    if (customPath !== undefined) return customPath;
    return ".configurator/reports/deployment-report-mock.json";
  }),
  isInManagedDirectory: vi.fn(() => false),
  pruneOldReports: vi.fn(async () => []),
  getReportsDirectory: vi.fn(() => ".configurator/reports"),
}));

vi.mock("../cli/console");
vi.mock("../cli/command", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../cli/command")>();
  return {
    ...actual,
    confirmAction: vi.fn().mockResolvedValue(true),
  };
});
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
  createJsonFormatter: vi.fn(() => ({
    format: vi.fn().mockReturnValue('{"mock":"json"}'),
  })),
}));

function createMockDiffService() {
  return {
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
}

function createMockConfigurator(
  diffService: Record<string, ReturnType<typeof vi.fn>>,
  overrides?: { diff?: ReturnType<typeof vi.fn> }
) {
  return {
    services: {
      diffService,
      configStorage: {
        load: vi.fn().mockResolvedValue({}),
      },
      configuration: {
        retrieveWithoutSaving: vi.fn().mockResolvedValue({}),
      },
    },
    diff:
      overrides?.diff !== undefined
        ? overrides.diff
        : vi.fn().mockResolvedValue({
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
}

function createConfiguratorWithError(
  diffService: Record<string, ReturnType<typeof vi.fn>>,
  error: Error
) {
  return createMockConfigurator(diffService, {
    diff: vi.fn().mockRejectedValue(error),
  });
}

function createDefaultArgs(overrides?: Partial<Parameters<typeof deployHandler>[0]>) {
  return {
    url: "https://test.saleor.cloud",
    token: "test-token",
    config: "config.yml",
    quiet: false,
    verbose: false,
    json: false,
    plan: false,
    failOnDelete: false,
    skipMedia: false,
    text: true, // Force human-readable in non-TTY test environment
    ...overrides,
  };
}

function createPartialMock<T>(partial: Partial<T>): T {
  return partial as unknown as T;
}

function setupProgressMocks() {
  if (!vi.mocked(cliConsole).progress) {
    vi.mocked(cliConsole).progress = {} as typeof cliConsole.progress;
  }
  vi.mocked(cliConsole).progress.start = vi.fn();
  vi.mocked(cliConsole).progress.update = vi.fn();
  vi.mocked(cliConsole).progress.succeed = vi.fn();
  vi.mocked(cliConsole).progress.fail = vi.fn();
  vi.mocked(cliConsole).progress.info = vi.fn();
  vi.mocked(cliConsole).progress.warn = vi.fn();
}

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
    mockExit = vi
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null): never => {
        throw new Error(`process.exit(${code})`);
      });

    vi.spyOn(logger, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockDiffService = createMockDiffService();

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

    vi.spyOn(deploymentModule, "DeploymentPipeline").mockImplementation(() =>
      createPartialMock<InstanceType<typeof deploymentModule.DeploymentPipeline>>(
        mockDeploymentPipeline
      )
    );

    const { executeEnhancedDeployment } = await import("../core/deployment/enhanced-pipeline");
    mockExecuteEnhancedDeployment = vi.mocked(executeEnhancedDeployment);
    mockExecuteEnhancedDeployment.mockImplementation(async () => ({
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
        overallStatus: "success" as const,
        stages: [],
        totalOperations: 1,
        successfulOperations: 1,
        failedOperations: 0,
      },
      shouldExit: true,
      exitCode: 0,
    }));

    vi.spyOn(deploymentModule, "getAllStages").mockReturnValue([]);
    vi.spyOn(deploymentModule, "DeploymentSummaryReport").mockImplementation(() =>
      createPartialMock<InstanceType<typeof deploymentModule.DeploymentSummaryReport>>({
        display: vi.fn(),
      })
    );
    vi.spyOn(deploymentModule, "DeploymentReportGenerator").mockImplementation(() =>
      createPartialMock<InstanceType<typeof deploymentModule.DeploymentReportGenerator>>({
        saveToFile: vi.fn(),
      })
    );

    mockCreateConfigurator = vi.fn().mockReturnValue(createMockConfigurator(mockDiffService));

    vi.spyOn(configuratorModule, "createConfigurator").mockImplementation(mockCreateConfigurator);

    setupProgressMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Error handling", () => {
    it("should handle network errors with exit code 3", async () => {
      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, new Error("fetch failed"))
      );

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(3)");
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should handle authentication errors with exit code 2", async () => {
      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, new Error("unauthorized"))
      );

      await expect(deployHandler(createDefaultArgs({ token: "invalid-token" }))).rejects.toThrow(
        "process.exit(2)"
      );
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

      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, validationError)
      );

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(4)");
      expect(mockExit).toHaveBeenCalledWith(4);
    });

    it("should handle DeploymentError instances directly", async () => {
      const deploymentError = new NetworkDeploymentError("Failed to connect to Saleor", {
        url: "https://test.saleor.cloud",
        timeout: 30000,
      });

      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, deploymentError)
      );

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(3)");
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should show verbose error details when verbose flag is set", async () => {
      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, new Error("econnrefused"))
      );

      await expect(deployHandler(createDefaultArgs({ verbose: true }))).rejects.toThrow(
        "process.exit(3)"
      );
      expect(mockExit).toHaveBeenCalledWith(3);
    });

    it("should handle unexpected errors with exit code 1", async () => {
      mockExecuteEnhancedDeployment.mockRejectedValue(new Error("Unexpected internal error"));

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(1)");
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle errors during diff analysis", async () => {
      mockCreateConfigurator.mockReturnValue(
        createConfiguratorWithError(mockDiffService, new Error("Invalid configuration structure"))
      );

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(4)");
      expect(mockExit).toHaveBeenCalledWith(4);
    });
  });

  describe("Successful deployment", () => {
    it("should exit gracefully when no changes detected", async () => {
      mockCreateConfigurator.mockReturnValue(
        createMockConfigurator(mockDiffService, {
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
        })
      );

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      expect(mockCreateConfigurator).toHaveBeenCalledWith(createDefaultArgs());
      expect(mockDeploymentPipeline.execute).not.toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should complete deployment successfully", async () => {
      const args = createDefaultArgs();

      await expect(deployHandler(args)).rejects.toThrow("process.exit(0)");

      expect(mockCreateConfigurator).toHaveBeenCalledWith(args);
      expect(mockExecuteEnhancedDeployment).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should skip confirmation in CI mode", async () => {
      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      const { confirmAction } = await import("../cli/command");
      expect(confirmAction).not.toHaveBeenCalled();
      expect(mockExecuteEnhancedDeployment).toHaveBeenCalled();
    });

    it("should save deployment report with custom path", async () => {
      const mockReportGenerator = {
        saveToFile: vi.fn(),
      };

      vi.spyOn(deploymentModule, "DeploymentReportGenerator").mockImplementation(() =>
        createPartialMock<InstanceType<typeof deploymentModule.DeploymentReportGenerator>>(
          mockReportGenerator
        )
      );

      await expect(
        deployHandler(createDefaultArgs({ reportPath: "custom-report.json" }))
      ).rejects.toThrow("process.exit(0)");

      expect(mockReportGenerator.saveToFile).toHaveBeenCalledWith("custom-report.json");
    });
  });

  describe("User confirmation", () => {
    it("should exit gracefully when user cancels", async () => {
      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValueOnce(false);

      const ciModeModule = await import("../lib/ci-mode");
      vi.spyOn(ciModeModule, "isNonInteractiveEnvironment").mockReturnValueOnce(false);

      await expect(deployHandler(createDefaultArgs())).rejects.toThrow("process.exit(0)");

      expect(mockExecuteEnhancedDeployment).not.toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });

  describe("deploy --plan --json", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it("outputs JSON with summary, operations, and willDeleteEntities", async () => {
      mockCreateConfigurator.mockReturnValue(
        createMockConfigurator(mockDiffService, {
          diff: vi.fn().mockResolvedValue({
            summary: {
              totalChanges: 2,
              creates: 1,
              updates: 1,
              deletes: 0,
              results: [
                {
                  operation: "CREATE",
                  entityType: "Categories",
                  entityName: "new-category",
                  changes: [],
                },
                {
                  operation: "UPDATE",
                  entityType: "Product Types",
                  entityName: "T-Shirt",
                  changes: [
                    { field: "name", currentValue: "Old Name", desiredValue: "T-Shirt" },
                    { field: "hasVariants", currentValue: false, desiredValue: true },
                  ],
                },
              ],
            },
            output: "",
          }),
        })
      );

      await expect(
        deployHandler(createDefaultArgs({ plan: true, json: true, text: false }))
      ).rejects.toThrow("process.exit(1)");

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const rawOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(rawOutput);

      // Verify envelope wrapper
      expect(parsed.command).toBe("deploy");
      expect(parsed.exitCode).toBe(1);
      expect(parsed.version).toBeDefined();
      expect(parsed.logs).toBeInstanceOf(Array);
      expect(parsed.errors).toBeInstanceOf(Array);

      // Verify result payload
      expect(parsed.result).toMatchObject({
        summary: {
          creates: 1,
          updates: 1,
          deletes: 0,
          noChange: 0,
        },
        willDeleteEntities: false,
        configFile: "config.yml",
        saleorUrl: "https://test.saleor.cloud",
      });

      expect(parsed.result.operations).toHaveLength(2);
      expect(parsed.result.validationErrors).toEqual([]);
    });

    it("each operation has entity, name, action, and fields", async () => {
      mockCreateConfigurator.mockReturnValue(
        createMockConfigurator(mockDiffService, {
          diff: vi.fn().mockResolvedValue({
            summary: {
              totalChanges: 1,
              creates: 0,
              updates: 1,
              deletes: 0,
              results: [
                {
                  operation: "UPDATE",
                  entityType: "Product Types",
                  entityName: "T-Shirt",
                  changes: [
                    { field: "name", currentValue: "Old", desiredValue: "T-Shirt" },
                    { field: "hasVariants", currentValue: false, desiredValue: true },
                  ],
                },
              ],
            },
            output: "",
          }),
        })
      );

      await expect(
        deployHandler(createDefaultArgs({ plan: true, json: true, text: false }))
      ).rejects.toThrow("process.exit(1)");

      const rawOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(rawOutput);

      expect(parsed.result.operations[0]).toEqual({
        entity: "Product Types",
        name: "T-Shirt",
        action: "update",
        fields: ["name", "hasVariants"],
      });
    });

    it("sets willDeleteEntities true when deletes are present", async () => {
      mockCreateConfigurator.mockReturnValue(
        createMockConfigurator(mockDiffService, {
          diff: vi.fn().mockResolvedValue({
            summary: {
              totalChanges: 1,
              creates: 0,
              updates: 0,
              deletes: 1,
              results: [
                {
                  operation: "DELETE",
                  entityType: "Categories",
                  entityName: "old-category",
                  changes: [],
                },
              ],
            },
            output: "",
          }),
        })
      );

      await expect(
        deployHandler(createDefaultArgs({ plan: true, json: true, text: false }))
      ).rejects.toThrow("process.exit(1)");

      const rawOutput = consoleLogSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(rawOutput);

      expect(parsed.result.willDeleteEntities).toBe(true);
      expect(parsed.result.summary.deletes).toBe(1);
      expect(parsed.result.operations[0]).toMatchObject({
        entity: "Categories",
        name: "old-category",
        action: "delete",
      });
    });

    it("exits 0 when no changes in plan mode", async () => {
      mockCreateConfigurator.mockReturnValue(
        createMockConfigurator(mockDiffService, {
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
        })
      );

      await expect(
        deployHandler(createDefaultArgs({ plan: true, json: true, text: false }))
      ).rejects.toThrow("process.exit(0)");

      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});
