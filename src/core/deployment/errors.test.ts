import { describe, expect, it } from "vitest";
import {
  AuthenticationDeploymentError,
  NetworkDeploymentError,
  PartialDeploymentError,
  StageAggregateError,
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

  describe("StageAggregateError", () => {
    it("should create stage error with failures and successes", () => {
      const failures = [
        { entity: "Product T-Shirt", error: new Error("Attribute 'color' not found") },
        { entity: "Product Hoodie", error: new Error("Duplicate slug 'hoodie'") },
      ];
      const successes = ["Product Jeans", "Product Shorts"];

      const error = new StageAggregateError("Creating Products", failures, successes);

      expect(error).toBeInstanceOf(StageAggregateError);
      expect(error.getExitCode()).toBe(5); // PARTIAL_FAILURE
      expect(error.failures).toHaveLength(2);
      expect(error.successes).toHaveLength(2);
      expect(error.context?.stageName).toBe("Creating Products");
      expect(error.context?.totalEntities).toBe(4);
      expect(error.context?.failedCount).toBe(2);
      expect(error.context?.successCount).toBe(2);
    });

    it("should create stage error with only failures", () => {
      const failures = [
        { entity: "Channel US", error: new Error("Currency code is required") },
        { entity: "Channel EU", error: new Error("Invalid country code") },
      ];

      const error = new StageAggregateError("Creating Channels", failures, []);

      expect(error).toBeInstanceOf(StageAggregateError);
      expect(error.failures).toHaveLength(2);
      expect(error.successes).toHaveLength(0);
      expect(error.context?.totalEntities).toBe(2);
      expect(error.context?.failedCount).toBe(2);
      expect(error.context?.successCount).toBe(0);
      expect(error.message).toContain("Creating Channels failed for 2 of 2 entities");
    });

    it("should format user message with successes and failures", () => {
      const failures = [
        { entity: "Category Electronics", error: new Error("Duplicate slug 'electronics'") },
        { entity: "Category Books", error: new Error("Parent category not found") },
      ];
      const successes = ["Category Clothing", "Category Sports"];

      const error = new StageAggregateError("Creating Categories", failures, successes);
      const message = error.getUserMessage();

      // Check header
      expect(message).toContain("❌ Creating Categories - 2 of 4 failed");

      // Check successes section
      expect(message).toContain("✅ Successful:");
      expect(message).toContain("• Category Clothing");
      expect(message).toContain("• Category Sports");

      // Check failures section
      expect(message).toContain("❌ Failed:");
      expect(message).toContain("• Category Electronics");
      expect(message).toContain("Error: Duplicate slug 'electronics'");
      expect(message).toContain("• Category Books");
      expect(message).toContain("Error: Parent category not found");

      // Check general suggestions
      expect(message).toContain("General suggestions:");
      expect(message).toContain("Review the individual errors below");
      expect(message).toContain("Fix the issues and run deploy again");
      expect(message).toContain("Use --include flag to deploy only specific entities");
    });

    it("should format user message with only failures", () => {
      const failures = [
        {
          entity: "Attribute Color",
          error: new Error("Entity type is required for reference attribute 'color'"),
        },
      ];

      const error = new StageAggregateError("Creating Attributes", failures, []);
      const message = error.getUserMessage();

      // Check header
      expect(message).toContain("❌ Creating Attributes - 1 of 1 failed");

      // Should not have successes section
      expect(message).not.toContain("✅ Successful:");

      // Check failures section
      expect(message).toContain("❌ Failed:");
      expect(message).toContain("• Attribute Color");
      expect(message).toContain("Error: Entity type is required for reference attribute 'color'");
    });

    it("should include recovery suggestions for individual errors", () => {
      const failures = [
        { entity: "Product T-Shirt", error: new Error("Attribute 'size' not found") },
        { entity: "Product Hoodie", error: new Error("Channel 'default-channel' not found") },
      ];

      const error = new StageAggregateError("Creating Products", failures);
      const message = error.getUserMessage();

      // Check that recovery suggestions are included
      expect(message).toContain(
        "→ Fix: Create the attribute 'size' first or reference an existing one"
      );
      expect(message).toContain("→ Check: View available attributes");
      expect(message).toContain("→ Run: saleor-configurator introspect --include=attributes");

      expect(message).toContain(
        "→ Fix: Create the channel 'default-channel' in the channels section first"
      );
      expect(message).toContain("→ Check: View existing channels");
      expect(message).toContain("→ Run: saleor-configurator introspect --include=channels");
    });

    it("should handle permission errors with appropriate suggestions", () => {
      const failures = [
        { entity: "Shop Settings", error: new Error("Permission denied: insufficient privileges") },
        { entity: "Channel Settings", error: new Error("Unauthorized access") },
      ];

      const error = new StageAggregateError("Updating Settings", failures);
      const message = error.getUserMessage();

      // Check that permission-specific recovery suggestions are included
      expect(message).toContain("→ Fix: Check your Saleor API token has the required permissions");
      expect(message).toContain("→ Check: Ensure you have admin permissions for the operations you're trying to perform");
      expect(message).toContain("→ Run: saleor-configurator introspect --include=shop");
    });

    it("should handle network errors with appropriate suggestions", () => {
      const failures = [
        { entity: "Product Sync", error: new Error("Error: connect ECONNREFUSED 127.0.0.1:8000") },
        { entity: "Channel Update", error: new Error("Request timeout ETIMEDOUT") },
      ];

      const error = new StageAggregateError("Synchronizing Data", failures);
      const message = error.getUserMessage();

      // Check that network-specific recovery suggestions are included
      expect(message).toContain("→ Fix: Check your Saleor API URL and network connection");
      expect(message).toContain("→ Check: Verify the SALEOR_API_URL environment variable is correct");
      expect(message).toContain("→ Run: curl -I $SALEOR_API_URL/graphql/");
    });

    it("should provide fallback suggestions for unknown errors", () => {
      const failures = [
        {
          entity: "Unknown Operation",
          error: new Error("Something completely unexpected happened"),
        },
      ];

      const error = new StageAggregateError("Processing Items", failures);
      const message = error.getUserMessage();

      // Check that fallback recovery suggestions are included
      expect(message).toContain("→ Fix: Review the error message for details");
      expect(message).toContain(
        "→ Check: Check your configuration against the current Saleor state"
      );
      expect(message).toContain("→ Run: saleor-configurator diff --verbose");
    });

    it("should handle verbose mode hint", () => {
      const failures = [{ entity: "Test Entity", error: new Error("Test error") }];

      const error = new StageAggregateError("Test Stage", failures);

      const normalMessage = error.getUserMessage(false);
      const verboseMessage = error.getUserMessage(true);

      expect(normalMessage).toContain(
        "Run 'saleor-configurator deploy --verbose' for detailed error traces"
      );
      expect(verboseMessage).toContain(
        "Run 'saleor-configurator deploy --verbose' for detailed error traces"
      );
    });

    it("should format complex real-world scenario", () => {
      const failures = [
        {
          entity: "Product Type T-Shirt",
          error: new Error("Failed to resolve referenced attributes: 'color', 'size' not found"),
        },
        {
          entity: "Product Basic Tee",
          error: new Error("Product type 'T-Shirt' not found"),
        },
        {
          entity: "Product Premium Tee",
          error: new Error("Category 'Clothing/T-Shirts' not found"),
        },
      ];
      const successes = [
        "Product Type Hoodie",
        "Product Type Jeans",
        "Product Basic Hoodie",
        "Product Premium Jeans",
      ];

      const error = new StageAggregateError("Deploying Product Catalog", failures, successes);
      const message = error.getUserMessage();

      // Verify comprehensive error reporting
      expect(message).toContain("❌ Deploying Product Catalog - 3 of 7 failed");

      // Verify successes are shown
      expect(message).toContain("✅ Successful:");
      expect(message).toContain("• Product Type Hoodie");
      expect(message).toContain("• Product Basic Hoodie");

      // Verify failures with specific recovery suggestions
      expect(message).toContain("• Product Type T-Shirt");
      expect(message).toContain(
        "→ Fix: Ensure referenced attributes exist and match the correct type (PRODUCT_TYPE or PAGE_TYPE)"
      );

      expect(message).toContain("• Product Basic Tee");
      expect(message).toContain(
        "→ Fix: Create the product type 'T-Shirt' in the productTypes section first"
      );

      expect(message).toContain("• Product Premium Tee");
      expect(message).toContain(
        "→ Fix: Ensure category 'Clothing/T-Shirts' exists or will be created earlier in deployment"
      );

      // Verify general suggestions
      expect(message).toContain("General suggestions:");
      expect(message).toContain("1. Review the individual errors below");
      expect(message).toContain("2. Fix the issues and run deploy again");
      expect(message).toContain("3. Use --include flag to deploy only specific entities");
      expect(message).toContain("4. Run 'saleor-configurator diff' to check current state");
    });

    it("should handle mixed error types with appropriate recovery suggestions", () => {
      const failures = [
        { entity: "Channel US", error: new Error("Permission denied: insufficient privileges") },
        { entity: "Product Laptop", error: new Error("Attribute 'processor' not found") },
        { entity: "Category Tech", error: new Error("connect ECONNREFUSED 127.0.0.1:8000") },
        { entity: "Shop Settings", error: new Error("slug is required") },
      ];

      const error = new StageAggregateError("Mixed Operations", failures);
      const message = error.getUserMessage();

      // Should contain different types of recovery suggestions
      expect(message).toContain("→ Fix: Check your Saleor API token has the required permissions");
      expect(message).toContain(
        "→ Fix: Create the attribute 'processor' first or reference an existing one"
      );
      expect(message).toContain("→ Fix: Check your Saleor API URL and network connection");
      expect(message).toContain("→ Fix: Add the required field to your configuration");
    });

    it("should handle edge cases gracefully", () => {
      // Empty failures array
      const error1 = new StageAggregateError("Empty Stage", [], ["Success"]);
      expect(error1.getUserMessage()).toContain("0 of 1 failed");

      // Error with empty message
      const error2 = new StageAggregateError("Test", [
        { entity: "Test Entity", error: new Error("") },
      ]);
      const message2 = error2.getUserMessage();
      expect(message2).toContain("• Test Entity");
      expect(message2).toContain("Error: ");

      // Error with null entity name
      const error3 = new StageAggregateError("Test", [
        { entity: "", error: new Error("Test error") },
      ]);
      const message3 = error3.getUserMessage();
      expect(message3).toContain("• ");
      expect(message3).toContain("Error: Test error");
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
