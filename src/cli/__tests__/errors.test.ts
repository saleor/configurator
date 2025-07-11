import { describe, expect, it } from "vitest";
import { BaseError } from "../../lib/errors/shared";
import { CliArgumentError, CliFileNotFoundError, CliValidationError } from "../errors";

describe("CLI Errors", () => {
  describe("CliArgumentError", () => {
    it("should create argument errors", () => {
      const error = new CliArgumentError("Invalid argument: --foo");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CliArgumentError);
      expect(error.message).toBe("Invalid argument: --foo");
      expect(error.code).toBe("CLI_ARGUMENT_ERROR");
      expect(error.name).toBe("CliArgumentError");
    });

    it("should be used for invalid URL formats", () => {
      const error = new CliArgumentError(
        "Invalid URL format: not-a-url. Expected format: https://your-store.saleor.cloud/graphql/"
      );

      expect(error.message).toContain("Invalid URL format");
      expect(error.message).toContain("Expected format");
    });
  });

  describe("CliValidationError", () => {
    it("should create validation errors", () => {
      const error = new CliValidationError("Token must be provided");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CliValidationError);
      expect(error.message).toBe("Token must be provided");
      expect(error.code).toBe("CLI_VALIDATION_ERROR");
      expect(error.name).toBe("CliValidationError");
    });
  });

  describe("CliFileNotFoundError", () => {
    it("should create file not found errors", () => {
      const error = new CliFileNotFoundError("Configuration file config.yaml not found");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CliFileNotFoundError);
      expect(error.message).toBe("Configuration file config.yaml not found");
      expect(error.code).toBe("CLI_FILE_NOT_FOUND_ERROR");
      expect(error.name).toBe("CliFileNotFoundError");
    });

    it("should maintain error hierarchy", () => {
      const error = new CliFileNotFoundError("File missing");

      // Check hierarchy
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(CliFileNotFoundError);
    });
  });

  describe("Error hierarchy", () => {
    it("should allow catching at different levels", () => {
      const errors = [
        new CliArgumentError("arg error"),
        new CliValidationError("validation error"),
        new CliFileNotFoundError("file error"),
      ];

      // All should be BaseError instances
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(BaseError);
      });

      // Each should be instance of its own type
      expect(errors[0]).toBeInstanceOf(CliArgumentError);
      expect(errors[1]).toBeInstanceOf(CliValidationError);
      expect(errors[2]).toBeInstanceOf(CliFileNotFoundError);
    });
  });
});
