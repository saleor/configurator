import { describe, expect, it } from "vitest";
import { BaseError } from "../../lib/errors/shared";
import {
  ConfigurationLoadError,
  ConfigurationValidationError,
  RemoteConfigurationError,
} from "./configuration-errors";

describe("Configuration Errors", () => {
  describe("ConfigurationLoadError", () => {
    it("should have correct properties", () => {
      const error = new ConfigurationLoadError("Failed to load config.yaml");

      expect(error.message).toBe("Failed to load config.yaml");
      expect(error).toBeInstanceOf(ConfigurationLoadError);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("ConfigurationLoadError");
      expect(error.code).toBe("CONFIG_LOAD_ERROR");
    });
  });

  describe("RemoteConfigurationError", () => {
    it("should have correct properties", () => {
      const error = new RemoteConfigurationError("Failed to fetch remote config");

      expect(error.message).toBe("Failed to fetch remote config");
      expect(error).toBeInstanceOf(RemoteConfigurationError);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("RemoteConfigurationError");
      expect(error.code).toBe("REMOTE_CONFIG_ERROR");
    });
  });

  describe("ConfigurationValidationError", () => {
    it("should have correct properties", () => {
      const validationErrors = [
        { path: "channels.0.name", message: "Field is required" },
        { path: "shop.email", message: "Invalid email format" },
      ];

      const error = new ConfigurationValidationError(
        "Configuration validation failed",
        "config.yaml",
        validationErrors
      );

      expect(error.message).toBe("Configuration validation failed");
      expect(error.filePath).toBe("config.yaml");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error).toBeInstanceOf(ConfigurationValidationError);
      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("ConfigurationValidationError");
      expect(error.code).toBe("CONFIG_VALIDATION_ERROR");
    });

    it("should store validation errors array", () => {
      const validationErrors = [{ path: "test.path", message: "Test message" }];

      const error = new ConfigurationValidationError("Test", "test.yaml", validationErrors);

      expect(error.validationErrors).toBe(validationErrors);
      expect(error.filePath).toBe("test.yaml");
    });
  });

  describe("Error Hierarchy", () => {
    it("should properly set up inheritance chain", () => {
      const errors = [
        new ConfigurationLoadError("load"),
        new RemoteConfigurationError("remote"),
        new ConfigurationValidationError("validation", "file.yaml", []),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(BaseError);
      });
    });
  });
});
