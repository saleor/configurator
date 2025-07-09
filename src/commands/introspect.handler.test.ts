import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfigurator } from "../core/configurator";
import {
  INTROSPECT_MESSAGES,
  type IntrospectCommandArgs,
  IntrospectCommandHandler,
} from "./introspect";

// Mock modules
vi.mock("../cli/console", () => ({
  cliConsole: {
    header: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    processing: vi.fn(),
    important: vi.fn((text: string) => text),
    setOptions: vi.fn(),
  },
}));

vi.mock("../cli/command", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    confirmAction: vi.fn(),
  };
});

vi.mock("../core/configurator", () => ({
  createConfigurator: vi.fn(),
}));

vi.mock("../lib/utils/file", () => ({
  fileExists: vi.fn(),
  createBackup: vi.fn(),
}));

import { confirmAction } from "../cli/command";
// Import mocked modules
import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { createBackup, fileExists } from "../lib/utils/file";

describe("IntrospectCommandHandler", () => {
  let handler: IntrospectCommandHandler;
  let mockConfigurator: Partial<SaleorConfigurator>;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new IntrospectCommandHandler();

    // Create mock configurator
    mockConfigurator = {
      introspect: vi.fn().mockResolvedValue(undefined),
      diffForIntrospect: vi.fn().mockResolvedValue({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
        formattedOutput: "No changes",
      }),
    };

    vi.mocked(createConfigurator).mockReturnValue(mockConfigurator as SaleorConfigurator);
  });

  const createTestArgs = (
    overrides: Partial<IntrospectCommandArgs> = {}
  ): IntrospectCommandArgs => ({
    config: "config.yml",
    url: "https://test.saleor.cloud/graphql/",
    token: "test-token",
    quiet: false,
    dryRun: false,
    include: undefined,
    exclude: undefined,
    backup: true,
    format: "table",
    ci: false,
    verbose: false,
    ...overrides,
  });

  describe("First-time user flow", () => {
    it("should handle first-time user with no config file", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(fileExists).mockReturnValue(false);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(result.exitCode).toBe(0);

      // Should show welcome messages
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.FIRST_TIME_WELCOME);
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.FIRST_TIME_FETCH);

      // Should fetch configuration
      expect(cliConsole.processing).toHaveBeenCalledWith(INTROSPECT_MESSAGES.PROCESSING_FETCH);
      expect(mockConfigurator.introspect!).toHaveBeenCalled();

      // Should show success messages
      expect(cliConsole.success).toHaveBeenCalledWith(
        INTROSPECT_MESSAGES.SUCCESS_SAVE(args.config)
      );
      expect(cliConsole.success).toHaveBeenCalledWith(INTROSPECT_MESSAGES.FIRST_TIME_SUCCESS);
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.FIRST_TIME_NEXT_STEPS);

      // Should not perform diff or ask for confirmation
      expect(mockConfigurator.diffForIntrospect!).not.toHaveBeenCalled();
      expect(confirmAction).not.toHaveBeenCalled();
    });

    it("should handle first-time user in quiet mode", async () => {
      // Arrange
      const args = createTestArgs({ quiet: true });
      vi.mocked(fileExists).mockReturnValue(false);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(result.exitCode).toBe(0);

      // Should not show any messages in quiet mode
      expect(cliConsole.info).not.toHaveBeenCalled();
      expect(cliConsole.processing).not.toHaveBeenCalled();
      expect(cliConsole.success).not.toHaveBeenCalled();

      // But should still fetch configuration
      expect(mockConfigurator.introspect!).toHaveBeenCalled();
    });

    it("should handle first-time user in CI mode", async () => {
      // Arrange
      const args = createTestArgs({ ci: true });
      vi.mocked(fileExists).mockReturnValue(false);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(result.exitCode).toBe(0);

      // CI mode implies quiet
      expect(cliConsole.info).not.toHaveBeenCalled();
      expect(mockConfigurator.introspect!).toHaveBeenCalled();
    });

    it("should handle first-time user with introspection error", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(fileExists).mockReturnValue(false);
      const error = new Error("Network error");
      vi.mocked(mockConfigurator.introspect!).mockRejectedValue(error);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toContain("Network error");
      }
    });
  });

  describe("Existing user flow", () => {
    beforeEach(() => {
      vi.mocked(fileExists).mockReturnValue(true);
    });

    it("should handle existing user with no changes", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          results: [],
        },
        formattedOutput: undefined,
      });

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(cliConsole.success).toHaveBeenCalledWith(INTROSPECT_MESSAGES.NO_CHANGES);
      expect(confirmAction).not.toHaveBeenCalled();
      expect(mockConfigurator.introspect!).not.toHaveBeenCalled();
    });

    it("should handle existing user with changes and confirmation", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 3,
          creates: 1,
          updates: 1,
          deletes: 1,
          results: [],
        },
        formattedOutput: undefined,
      });
      vi.mocked(confirmAction).mockResolvedValue(true);
      vi.mocked(createBackup).mockResolvedValue("config.yml.backup");

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(cliConsole.warn).toHaveBeenCalledWith(INTROSPECT_MESSAGES.WARNING_OVERWRITE);
      expect(confirmAction).toHaveBeenCalled();
      expect(createBackup).toHaveBeenCalledWith(args.config);
      expect(mockConfigurator.introspect!).toHaveBeenCalled();
    });

    it("should handle existing user with dry run", async () => {
      // Arrange
      const args = createTestArgs({ dryRun: true });
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 2,
          creates: 1,
          updates: 1,
          deletes: 0,
          results: [],
        },
        formattedOutput: undefined,
      });

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("success");
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.DRY_RUN_CHANGES(2));
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.DRY_RUN_HINT);
      expect(confirmAction).not.toHaveBeenCalled();
      expect(mockConfigurator.introspect!).not.toHaveBeenCalled();
    });

    it("should handle existing user cancelling operation", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(mockConfigurator.diffForIntrospect!).mockResolvedValue({
        summary: {
          totalChanges: 1,
          creates: 1,
          updates: 0,
          deletes: 0,
          results: [],
        },
        formattedOutput: undefined,
      });
      vi.mocked(confirmAction).mockResolvedValue(false);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("cancelled");
      expect(cliConsole.info).toHaveBeenCalledWith(INTROSPECT_MESSAGES.OPERATION_CANCELLED);
      expect(mockConfigurator.introspect!).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should provide actionable advice for connection errors", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(fileExists).mockReturnValue(true);
      const error = new Error("ECONNREFUSED: Connection refused");
      vi.mocked(mockConfigurator.diffForIntrospect!).mockRejectedValue(error);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toContain("ECONNREFUSED");
        expect(result.message).toContain("Check that the Saleor URL is correct");
      }
    });

    it("should provide actionable advice for authentication errors", async () => {
      // Arrange
      const args = createTestArgs();
      vi.mocked(fileExists).mockReturnValue(true);
      const error = new Error("401 Unauthorized");
      vi.mocked(mockConfigurator.diffForIntrospect!).mockRejectedValue(error);

      // Act
      const result = await handler.execute(args);

      // Assert
      expect(result.type).toBe("error");
      if (result.type === "error") {
        expect(result.message).toContain("401");
        expect(result.message).toContain("Check that your authentication token is valid");
      }
    });
  });
});
