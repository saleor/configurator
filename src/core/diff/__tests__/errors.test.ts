import { describe, expect, it } from "vitest";
import { BaseError } from "../../../lib/errors/shared";
import { DiffComparisonError, DiffError, DiffSummaryError, EntityValidationError } from "../errors";

describe("Diff Errors", () => {
  describe("DiffError", () => {
    it("should be the base for all diff errors", () => {
      // DiffError is abstract, so we test with a concrete implementation
      const error = new EntityValidationError("Test error");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(DiffError);
    });
  });

  describe("EntityValidationError", () => {
    it("should have correct properties", () => {
      const error = new EntityValidationError("Entity validation failed");

      expect(error.message).toBe("Entity validation failed");
      expect(error).toBeInstanceOf(EntityValidationError);
      expect(error).toBeInstanceOf(DiffError);
      expect(error.name).toBe("EntityValidationError");
    });
  });

  describe("DiffComparisonError", () => {
    it("should have correct properties", () => {
      const error = new DiffComparisonError("Comparison failed");

      expect(error.message).toBe("Comparison failed");
      expect(error).toBeInstanceOf(DiffComparisonError);
      expect(error).toBeInstanceOf(DiffError);
      expect(error.name).toBe("DiffComparisonError");
    });
  });

  describe("DiffSummaryError", () => {
    it("should have correct properties", () => {
      const error = new DiffSummaryError("Summary generation failed");

      expect(error.message).toBe("Summary generation failed");
      expect(error).toBeInstanceOf(DiffSummaryError);
      expect(error).toBeInstanceOf(DiffError);
      expect(error.name).toBe("DiffSummaryError");
    });
  });

  describe("Error Hierarchy", () => {
    it("should properly set up inheritance chain", () => {
      const errors = [
        new EntityValidationError("entity"),
        new DiffComparisonError("comparison"),
        new DiffSummaryError("summary"),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(BaseError);
        expect(error).toBeInstanceOf(DiffError);
      });
    });
  });
});
