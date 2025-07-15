import { describe, expect, it } from "vitest";
import { BaseError } from "../../lib/errors/shared";
import { CliArgumentError } from "../errors";

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
});

describe("Error hierarchy", () => {
  it("should allow catching at different levels", () => {
    const errors = [new CliArgumentError("arg error")];

    // All should be BaseError instances
    errors.forEach((error) => {
      expect(error).toBeInstanceOf(BaseError);
    });

    // Each should be instance of its own type
    expect(errors[0]).toBeInstanceOf(CliArgumentError);
  });
});
