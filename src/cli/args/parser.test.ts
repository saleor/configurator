import { describe, it, expect } from "vitest";
import { parseRawArguments, hasHelpRequest, normalizeArgumentKey } from "./parser";

describe("parseRawArguments", () => {
  describe("key-value pair parsing", () => {
    it("should parse --key=value format correctly", () => {
      // Arrange
      const argv = ["--url=https://example.com", "--token=abc123"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        url: "https://example.com",
        token: "abc123",
      });
    });

    it("should parse --key value format correctly", () => {
      // Arrange
      const argv = ["--url", "https://example.com", "--token", "abc123"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        url: "https://example.com",
        token: "abc123",
      });
    });

    it("should handle values with equals signs in --key=value format", () => {
      // Arrange
      const argv = ["--query=SELECT * FROM table WHERE id=123"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        query: "SELECT * FROM table WHERE id=123",
      });
    });

    it("should handle empty values in --key=value format", () => {
      // Arrange
      const argv = ["--description=", "--title=test"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        description: "",
        title: "test",
      });
    });
  });

  describe("boolean flag parsing", () => {
    it("should parse boolean flags correctly", () => {
      // Arrange
      const argv = ["--verbose", "--quiet"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        verbose: true,
        quiet: true,
      });
    });

    it("should treat arguments starting with -- as flags when no value follows", () => {
      // Arrange
      const argv = ["--flag1", "--flag2"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        flag1: true,
        flag2: true,
      });
    });
  });

  describe("mixed argument parsing", () => {
    it("should handle mixed key-value and boolean arguments", () => {
      // Arrange
      const argv = ["--url=https://api.example.com", "--token", "secret", "--verbose"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        url: "https://api.example.com",
        token: "secret",
        verbose: true,
      });
    });

    it("should ignore non-option arguments", () => {
      // Arrange
      const argv = ["command", "--url=test.com", "some-file.txt", "--verbose"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        url: "test.com",
        verbose: true,
      });
    });
  });

  describe("error handling", () => {
    it("should throw error for duplicate arguments", () => {
      // Arrange
      const argv = ["--url=first.com", "--url=second.com"];

      // Act & Assert
      expect(() => parseRawArguments(argv)).toThrow("Duplicate argument: --url");
    });

    it("should throw error for invalid argument format", () => {
      // Arrange
      const argv = ["--"];

      // Act & Assert
      expect(() => parseRawArguments(argv)).toThrow("Invalid argument format: --");
    });

    it("should throw error for key without value in key=value format", () => {
      // Arrange
      const argv = ["--=value"];

      // Act & Assert
      expect(() => parseRawArguments(argv)).toThrow("Invalid argument: missing key");
    });
  });

  describe("edge cases", () => {
    it("should handle empty argv array", () => {
      // Arrange
      const argv: string[] = [];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({});
    });

    it("should handle arguments with special characters", () => {
      // Arrange
      const argv = ["--url=https://api.example.com/v1?key=value&other=123"];

      // Act
      const result = parseRawArguments(argv);

      // Assert
      expect(result).toEqual({
        url: "https://api.example.com/v1?key=value&other=123",
      });
    });
  });
});

describe("hasHelpRequest", () => {
  it("should detect --help flag", () => {
    // Arrange
    const argv = ["--url=test.com", "--help"];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(true);
  });

  it("should detect -h flag", () => {
    // Arrange
    const argv = ["--verbose", "-h"];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(true);
  });

  it("should detect --usage flag", () => {
    // Arrange
    const argv = ["--usage"];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false when no help flags present", () => {
    // Arrange
    const argv = ["--url=test.com", "--verbose"];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(false);
  });

  it("should handle empty argv", () => {
    // Arrange
    const argv: string[] = [];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(false);
  });

  it("should be case insensitive", () => {
    // Arrange
    const argv = ["--HELP"];

    // Act
    const result = hasHelpRequest(argv);

    // Assert
    expect(result).toBe(true);
  });
});

describe("normalizeArgumentKey", () => {
  it("should convert kebab-case to camelCase", () => {
    // Arrange
    const key = "some-long-key-name";

    // Act
    const result = normalizeArgumentKey(key);

    // Assert
    expect(result).toBe("someLongKeyName");
  });

  it("should preserve camelCase keys", () => {
    // Arrange
    const key = "alreadyCamelCase";

    // Act
    const result = normalizeArgumentKey(key);

    // Assert
    expect(result).toBe("alreadyCamelCase");
  });

  it("should convert to lowercase when case insensitive", () => {
    // Arrange
    const key = "MixedCaseKey";

    // Act
    const result = normalizeArgumentKey(key, false);

    // Assert
    expect(result).toBe("mixedcasekey");
  });

  it("should handle single character keys", () => {
    // Arrange
    const key = "x";

    // Act
    const result = normalizeArgumentKey(key);

    // Assert
    expect(result).toBe("x");
  });

  it("should handle empty string", () => {
    // Arrange
    const key = "";

    // Act
    const result = normalizeArgumentKey(key);

    // Assert
    expect(result).toBe("");
  });
});
