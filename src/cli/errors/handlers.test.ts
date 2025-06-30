import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCliError, createValidationError, handleCliError } from "./handlers";
import { isCliError, isValidationError } from "./types";

describe("createCliError", () => {
  it("should create a CLI error with proper properties", () => {
    // Arrange
    const message = "Test error message";
    const helpText = "This is help text";

    // Act
    const error = createCliError(message, helpText);

    // Assert
    expect(error.message).toBe(message);
    expect(error.isCliError).toBe(true);
    expect(error.helpText).toBe(helpText);
    expect(isCliError(error)).toBe(true);
  });

  it("should create a CLI error without help text", () => {
    // Arrange
    const message = "Simple error message";

    // Act
    const error = createCliError(message);

    // Assert
    expect(error.message).toBe(message);
    expect(error.isCliError).toBe(true);
    expect(error.helpText).toBeUndefined();
    expect(isCliError(error)).toBe(true);
  });

  it("should make properties immutable", () => {
    // Arrange
    const error = createCliError("Test message", "Help text");

    // Act & Assert
    expect(() => {
      (error as any).isCliError = false;
    }).toThrow();

    expect(() => {
      (error as any).helpText = "Modified help";
    }).toThrow();

    expect(error.isCliError).toBe(true);
    expect(error.helpText).toBe("Help text");
  });
});

describe("createValidationError", () => {
  it("should create a validation error with all properties", () => {
    // Arrange
    const field = "url";
    const value = "invalid-url";
    const expectedType = "valid URL";
    const helpText = "Please provide a valid URL";

    // Act
    const error = createValidationError(field, value, expectedType, helpText);

    // Assert
    expect(error.field).toBe(field);
    expect(error.value).toBe(value);
    expect(error.expectedType).toBe(expectedType);
    expect(error.helpText).toBe(helpText);
    expect(error.message).toBe(
      `Invalid value for '${field}': expected ${expectedType}, got ${typeof value}`
    );
    expect(isCliError(error)).toBe(true);
    expect(isValidationError(error)).toBe(true);
  });

  it("should create a validation error without help text", () => {
    // Arrange
    const field = "token";
    const value = "";
    const expectedType = "non-empty string";

    // Act
    const error = createValidationError(field, value, expectedType);

    // Assert
    expect(error.field).toBe(field);
    expect(error.value).toBe(value);
    expect(error.expectedType).toBe(expectedType);
    expect(error.helpText).toBeUndefined();
    expect(error.message).toBe(
      `Invalid value for '${field}': expected ${expectedType}, got ${typeof value}`
    );
    expect(isValidationError(error)).toBe(true);
  });

  it("should handle different value types correctly", () => {
    // Arrange
    const testCases = [
      { value: 123, expectedType: "number" },
      { value: true, expectedType: "boolean" },
      { value: null, expectedType: "object" },
      { value: undefined, expectedType: "undefined" },
      { value: [], expectedType: "object" },
    ];

    testCases.forEach(({ value, expectedType }) => {
      // Act
      const error = createValidationError("field", value, expectedType);

      // Assert
      expect(error.message).toContain(`got ${typeof value}`);
    });
  });

  it("should make validation-specific properties immutable", () => {
    // Arrange
    const error = createValidationError("field", "value", "type");

    // Act & Assert
    expect(() => {
      (error as any).field = "modified";
    }).toThrow();

    expect(() => {
      (error as any).value = "modified";
    }).toThrow();

    expect(() => {
      (error as any).expectedType = "modified";
    }).toThrow();

    expect(error.field).toBe("field");
    expect(error.value).toBe("value");
    expect(error.expectedType).toBe("type");
  });
});

describe("handleCliError", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;

  beforeEach(() => {
    // Mock console.error to avoid cluttering test output
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock process.exit to prevent test from actually exiting
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("Process exit called");
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should handle CLI errors with help text", () => {
    // Arrange
    const error = createCliError("Test CLI error", "This is helpful information");
    const commandName = "test-command";

    // Act & Assert
    expect(() => handleCliError(error, commandName)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Test CLI error");
    expect(consoleSpy).toHaveBeenCalledWith("\n💡 This is helpful information");
    expect(consoleSpy).toHaveBeenCalledWith(
      `\n🔍 Run 'npm run ${commandName} -- --help' for usage information`
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle CLI errors without help text", () => {
    // Arrange
    const error = createCliError("Test CLI error without help");
    const commandName = "test-command";

    // Act & Assert
    expect(() => handleCliError(error, commandName)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Test CLI error without help");
    expect(consoleSpy).toHaveBeenCalledWith(
      `\n🔍 Run 'npm run ${commandName} -- --help' for usage information`
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle validation errors", () => {
    // Arrange
    const error = createValidationError(
      "url",
      "invalid",
      "valid URL",
      "Please check the URL format"
    );

    // Act & Assert
    expect(() => handleCliError(error)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith(
      `❌ Invalid value for 'url': expected valid URL, got string`
    );
    expect(consoleSpy).toHaveBeenCalledWith("\n💡 Please check the URL format");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle regular Error objects", () => {
    // Arrange
    const error = new Error("Regular error message");

    // Act & Assert
    expect(() => handleCliError(error)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Unexpected error: Regular error message");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should handle non-Error objects", () => {
    // Arrange
    const error = "String error";

    // Act & Assert
    expect(() => handleCliError(error)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith("❌ Unexpected error: String error");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it("should use default command name when not provided", () => {
    // Arrange
    const error = createCliError("Test error");

    // Act & Assert
    expect(() => handleCliError(error)).toThrow("Process exit called");

    expect(consoleSpy).toHaveBeenCalledWith(
      `\n🔍 Run 'npm run command -- --help' for usage information`
    );
  });
});
