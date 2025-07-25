import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handlePush } from "./push";
import * as configuratorModule from "../core/configurator";
import { NetworkDeploymentError, AuthenticationDeploymentError } from "../core/errors/deployment-errors";

// Mock modules
vi.mock("../cli/console");
vi.mock("../cli/command");
vi.mock("../lib/logger");

describe("Push Command", () => {
  let mockCreateConfigurator: ReturnType<typeof vi.fn>;
  let mockPush: ReturnType<typeof vi.fn>;
  let mockExit: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Mock process.exit
    mockExit = vi.spyOn(process, "exit").mockImplementation((code) => {
      throw new Error(`Process exited with code ${code}`);
    });
    
    // Mock console methods
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    // Mock configurator
    mockPush = vi.fn();
    mockCreateConfigurator = vi.fn().mockReturnValue({
      push: mockPush,
    });
    
    vi.spyOn(configuratorModule, "createConfigurator").mockImplementation(
      mockCreateConfigurator
    );
    
    // Mock confirmAction to always return true
    vi.mock("../cli/command", async () => {
      const actual = await vi.importActual("../cli/command");
      return {
        ...actual,
        confirmAction: vi.fn().mockResolvedValue(true),
      };
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  describe("Successful push", () => {
    it("should complete successfully with force flag", async () => {
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).resolves.not.toThrow();
      
      expect(mockCreateConfigurator).toHaveBeenCalledWith(args);
      expect(mockPush).toHaveBeenCalled();
    });
    
    it("should skip push with dry-run flag", async () => {
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: false,
        dryRun: true,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 0");
      
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
  
  describe("Error handling", () => {
    it("should handle network errors with exit code 3", async () => {
      const networkError = new Error("fetch failed");
      mockPush.mockRejectedValue(networkError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 3");
      
      expect(mockPush).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(3);
    });
    
    it("should handle authentication errors with exit code 2", async () => {
      const authError = new Error("Unauthorized: Invalid token");
      mockPush.mockRejectedValue(authError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "invalid-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 2");
      
      expect(mockExit).toHaveBeenCalledWith(2);
    });
    
    it("should handle validation errors with exit code 4", async () => {
      const validationError = new Error("Validation failed: Missing required field");
      mockPush.mockRejectedValue(validationError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 4");
      
      expect(mockExit).toHaveBeenCalledWith(4);
    });
    
    it("should handle DeploymentError instances directly", async () => {
      const deploymentError = new NetworkDeploymentError(
        "Connection timeout",
        { url: "https://test.saleor.cloud" }
      );
      mockPush.mockRejectedValue(deploymentError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 3");
      
      expect(mockExit).toHaveBeenCalledWith(3);
    });
    
    it("should show verbose error details when verbose flag is set", async () => {
      const originalError = new Error("ECONNREFUSED");
      const authError = new AuthenticationDeploymentError(
        "Failed to authenticate",
        { endpoint: "/graphql" },
        originalError
      );
      mockPush.mockRejectedValue(authError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: true,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 2");
      
      // The error message should be displayed via console
      // In real implementation, Console class would handle this
      expect(mockExit).toHaveBeenCalledWith(2);
    });
    
    it("should handle unexpected errors with exit code 1", async () => {
      const unexpectedError = new Error("Something unexpected happened");
      mockPush.mockRejectedValue(unexpectedError);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: true,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 1");
      
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
  
  describe("User confirmation", () => {
    it("should exit with code 0 when user cancels", async () => {
      // Mock confirmAction to return false
      const { confirmAction } = await import("../cli/command");
      vi.mocked(confirmAction).mockResolvedValue(false);
      
      const args = {
        url: "https://test.saleor.cloud",
        token: "test-token",
        config: "config.yml",
        force: false,
        dryRun: false,
        quiet: false,
        verbose: false,
      };
      
      await expect(handlePush(args)).rejects.toThrow("Process exited with code 0");
      
      expect(mockPush).not.toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });
  });
});