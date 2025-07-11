import { describe, expect, it } from "vitest";
import { BaseError } from "../../../lib/errors/shared";
import {
  ConfigurationLoadError,
  DiffComparisonError,
  DiffError,
  DiffSummaryError,
  EntityValidationError,
  RemoteConfigurationError,
} from "../errors";

describe("Diff Errors", () => {
  describe("DiffError", () => {
    it("should be the base for all diff errors", () => {
      // DiffError is abstract, so we test with a concrete implementation
      const error = new ConfigurationLoadError("Test error");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(DiffError);
    });
  });

  describe("ConfigurationLoadError", () => {
    it("should create configuration load errors", () => {
      const error = new ConfigurationLoadError("Failed to load config.yaml");

      expect(error).toBeInstanceOf(DiffError);
      expect(error).toBeInstanceOf(ConfigurationLoadError);
      expect(error.message).toBe("Failed to load config.yaml");
      expect(error.code).toBe("CONFIG_LOAD_ERROR");
      expect(error.name).toBe("ConfigurationLoadError");
    });
  });

  describe("RemoteConfigurationError", () => {
    it("should create remote configuration errors", () => {
      const error = new RemoteConfigurationError("Failed to fetch remote config");

      expect(error).toBeInstanceOf(DiffError);
      expect(error).toBeInstanceOf(RemoteConfigurationError);
      expect(error.message).toBe("Failed to fetch remote config");
      expect(error.code).toBe("REMOTE_CONFIG_ERROR");
      expect(error.name).toBe("RemoteConfigurationError");
    });
  });

  describe("EntityValidationError", () => {
    it("should create entity validation errors", () => {
      const error = new EntityValidationError("Invalid product type");

      expect(error).toBeInstanceOf(DiffError);
      expect(error).toBeInstanceOf(EntityValidationError);
      expect(error.message).toBe("Invalid product type");
      expect(error.code).toBe("ENTITY_VALIDATION_ERROR");
      expect(error.name).toBe("EntityValidationError");
    });
  });

  describe("DiffComparisonError", () => {
    it("should create diff comparison errors", () => {
      const error = new DiffComparisonError("Failed to compare entities");

      expect(error).toBeInstanceOf(DiffError);
      expect(error).toBeInstanceOf(DiffComparisonError);
      expect(error.message).toBe("Failed to compare entities");
      expect(error.code).toBe("DIFF_COMPARISON_ERROR");
      expect(error.name).toBe("DiffComparisonError");
    });
  });

  describe("DiffSummaryError", () => {
    it("should create diff summary errors", () => {
      const error = new DiffSummaryError("Failed to generate summary");

      expect(error).toBeInstanceOf(DiffError);
      expect(error).toBeInstanceOf(DiffSummaryError);
      expect(error.message).toBe("Failed to generate summary");
      expect(error.code).toBe("DIFF_SUMMARY_ERROR");
      expect(error.name).toBe("DiffSummaryError");
    });
  });

  describe("Error hierarchy", () => {
    it("should maintain proper inheritance chain", () => {
      const errors = [
        new ConfigurationLoadError("load"),
        new RemoteConfigurationError("remote"),
        new EntityValidationError("validation"),
        new DiffComparisonError("comparison"),
        new DiffSummaryError("summary"),
      ];

      // All should be instances of the base classes
      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(BaseError);
        expect(error).toBeInstanceOf(DiffError);
      });
    });
  });
});
