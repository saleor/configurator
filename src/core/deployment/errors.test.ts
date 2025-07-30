import { describe, expect, it } from "vitest";
import {
  AuthenticationDeploymentError,
  NetworkDeploymentError,
  PartialDeploymentError,
  toDeploymentError,
  UnexpectedDeploymentError,
  ValidationDeploymentError,
} from "./errors";

describe("DeploymentError Classes", () => {
  describe("NetworkDeploymentError", () => {
    it("should create network error with correct exit code", () => {
      const error = new NetworkDeploymentError("Connection failed", {
        url: "https://example.com",
      });

      expect(error).toBeInstanceOf(NetworkDeploymentError);
      expect(error.getExitCode()).toBe(3);
      expect(error.message).toBe("Connection failed");
      expect(error.suggestions).toContain("Check your internet connection");
    });

    it("should format user message correctly", () => {
      const error = new NetworkDeploymentError("Connection refused", {
        url: "https://store.saleor.cloud",
        attempt: 1,
      });

      const message = error.getUserMessage();
      expect(message).toContain("❌ Deployment failed: Network Error");
      expect(message).toContain("Connection refused");
      expect(message).toContain("url: https://store.saleor.cloud");
      expect(message).toContain("Suggested actions:");
      expect(message).toContain("Check your internet connection");
    });

    it("should include original error in verbose mode", () => {
      const originalError = new Error("ECONNREFUSED");
      const error = new NetworkDeploymentError("Connection failed", {}, originalError);

      const verboseMessage = error.getUserMessage(true);
      expect(verboseMessage).toContain("Original error:");
      expect(verboseMessage).toContain("ECONNREFUSED");
    });
  });

  describe("AuthenticationDeploymentError", () => {
    it("should create auth error with correct exit code", () => {
      const error = new AuthenticationDeploymentError("Invalid token");

      expect(error).toBeInstanceOf(AuthenticationDeploymentError);
      expect(error.getExitCode()).toBe(2);
      expect(error.suggestions).toContain("Verify your API token is correct: --token YOUR_TOKEN");
    });

    it("should format auth error message", () => {
      const error = new AuthenticationDeploymentError("Token validation failed", {
        tokenLength: 10,
      });

      const message = error.getUserMessage();
      expect(message).toContain("❌ Deployment failed: Authentication Error");
      expect(message).toContain("Token validation failed");
      expect(message).toContain("Check token permissions in Saleor dashboard");
    });
  });

  describe("ValidationDeploymentError", () => {
    it("should create validation error with validation details", () => {
      const validationErrors = ["Field 'name' is required", "Invalid currency code"];
      const error = new ValidationDeploymentError("Configuration is invalid", validationErrors);

      expect(error).toBeInstanceOf(ValidationDeploymentError);
      expect(error.getExitCode()).toBe(4);
      expect(error.context?.validationErrors).toContain("Field 'name' is required");
    });

    it("should include validation errors in message", () => {
      const error = new ValidationDeploymentError(
        "Invalid configuration",
        ["Missing required field: slug", "Invalid enum value: currencyCode"],
        { file: "config.yml" }
      );

      const message = error.getUserMessage();
      expect(message).toContain("❌ Deployment failed: Validation Error");
      expect(message).toContain("file: config.yml");
      expect(message).toContain("Missing required field: slug");
    });
  });

  describe("PartialDeploymentError", () => {
    it("should create partial error with operation lists", () => {
      const completed = ["Create channel", "Update shop settings"];
      const failed = [
        { operation: "Create product type", error: "Name already exists" },
        { operation: "Create attribute", error: "Invalid input type" },
      ];

      const error = new PartialDeploymentError("Some operations failed", completed, failed);

      expect(error).toBeInstanceOf(PartialDeploymentError);
      expect(error.getExitCode()).toBe(5);
      expect(error.completedOperations).toHaveLength(2);
      expect(error.failedOperations).toHaveLength(2);
    });

    it("should format partial error message with operation details", () => {
      const error = new PartialDeploymentError(
        "Deployment partially succeeded",
        ["Shop settings updated", "Channel created"],
        [
          { operation: "Product type creation", error: "Duplicate name" },
          { operation: "Attribute assignment", error: "Not found" },
        ]
      );

      const message = error.getUserMessage();
      expect(message).toContain("❌ Deployment failed: Partial Deployment Failure");
      expect(message).toContain("✅ Completed operations:");
      expect(message).toContain("• Shop settings updated");
      expect(message).toContain("❌ Failed operations:");
      expect(message).toContain("• Product type creation: Duplicate name");
      expect(message).toContain("completedCount: 2");
      expect(message).toContain("failedCount: 2");
    });
  });

  describe("UnexpectedDeploymentError", () => {
    it("should create generic error with exit code 1", () => {
      const error = new UnexpectedDeploymentError("Something went wrong");

      expect(error).toBeInstanceOf(UnexpectedDeploymentError);
      expect(error.getExitCode()).toBe(1);
      expect(error.suggestions).toContain("Run with --verbose flag for more details");
    });
  });

  describe("toDeploymentError Helper", () => {
    it("should return existing DeploymentError unchanged", () => {
      const original = new NetworkDeploymentError("Test");
      const result = toDeploymentError(original);

      expect(result).toBe(original);
    });

    it("should convert network errors", () => {
      const errors = [
        new Error("fetch failed"),
        new Error("ECONNREFUSED: Connection refused"),
        new Error("ETIMEDOUT"),
        new Error("Network request failed"),
        new Error("getaddrinfo ENOTFOUND"),
      ];

      for (const error of errors) {
        const result = toDeploymentError(error);
        expect(result).toBeInstanceOf(NetworkDeploymentError);
        expect(result.originalError).toBe(error);
      }
    });

    it("should convert authentication errors", () => {
      const errors = [
        new Error("Unauthorized"),
        new Error("Authentication required"),
        new Error("Permission denied"),
        new Error("Forbidden: insufficient permissions"),
        new Error("Invalid token provided"),
      ];

      for (const error of errors) {
        const result = toDeploymentError(error);
        expect(result).toBeInstanceOf(AuthenticationDeploymentError);
      }
    });

    it("should convert validation errors", () => {
      const errors = [
        new Error("Validation failed"),
        new Error("Invalid configuration"),
        new Error("Required field missing"),
      ];

      for (const error of errors) {
        const result = toDeploymentError(error);
        expect(result).toBeInstanceOf(ValidationDeploymentError);
      }
    });

    it("should convert unknown errors to UnexpectedDeploymentError", () => {
      const error = new Error("Random error");
      const result = toDeploymentError(error);

      expect(result).toBeInstanceOf(UnexpectedDeploymentError);
      expect(result.message).toContain("Unexpected error during deployment");
    });

    it("should handle non-Error objects", () => {
      const result = toDeploymentError("string error");

      expect(result).toBeInstanceOf(UnexpectedDeploymentError);
      expect(result.originalError).toBe("string error");
    });

    it("should include operation context", () => {
      const error = new Error("Network timeout");
      const result = toDeploymentError(error, "channel creation");

      expect(result).toBeInstanceOf(NetworkDeploymentError);
      expect(result.context?.operation).toBe("channel creation");
    });
  });

  describe("Error Message Formatting", () => {
    it("should not show verbose hint when verbose is true", () => {
      const error = new NetworkDeploymentError("Test error");

      const normalMessage = error.getUserMessage(false);
      const verboseMessage = error.getUserMessage(true);

      expect(normalMessage).toContain("For more details, run with --verbose flag.");
      expect(verboseMessage).not.toContain("For more details, run with --verbose flag.");
    });

    it("should preserve stack trace from original error", () => {
      const originalError = new Error("Original");
      originalError.stack = "Error: Original\n    at test.js:10:5";

      const error = new NetworkDeploymentError("Wrapped", {}, originalError);

      expect(error.stack).toBe(originalError.stack);
    });
  });
});
