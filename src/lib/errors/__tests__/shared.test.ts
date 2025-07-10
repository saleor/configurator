import { describe, expect, it } from "vitest";
import { BaseError, EnvironmentVariableError } from "../shared";

// Test error class for testing BaseError
class TestError extends BaseError {
  constructor(message: string) {
    super(message, "TEST_ERROR");
  }
}

describe("BaseError", () => {
  it("should set name and code correctly", () => {
    const error = new TestError("Test message");
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(BaseError);
    expect(error.name).toBe("TestError");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.message).toBe("Test message");
  });

  it("should maintain proper stack trace", () => {
    const error = new TestError("Stack trace test");
    
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("TestError");
    expect(error.stack).toContain("Stack trace test");
  });

  it("should work with different error codes", () => {
    class CustomError extends BaseError {
      constructor(message: string) {
        super(message, "CUSTOM_ERROR_CODE");
      }
    }
    
    const error = new CustomError("Custom error");
    expect(error.code).toBe("CUSTOM_ERROR_CODE");
  });
});

describe("EnvironmentVariableError", () => {
  it("should create environment variable errors", () => {
    const error = new EnvironmentVariableError("Invalid LOG_LEVEL");
    
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(EnvironmentVariableError);
    expect(error.code).toBe("ENVIRONMENT_VARIABLE_ERROR");
    expect(error.message).toBe("Invalid LOG_LEVEL");
  });
});