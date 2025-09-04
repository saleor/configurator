import { expect } from "vitest";
import type { CliResult } from "./cli-runner.js";

// Custom matchers for CLI testing
export const cliMatchers = {
  toHaveSucceeded(received: CliResult) {
    const pass = received.success && received.exitCode === 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected command to fail, but it succeeded`
          : `Expected command to succeed, but it failed with exit code ${received.exitCode}\nStderr: ${received.cleanStderr}`,
    };
  },

  toHaveFailed(received: CliResult) {
    const pass = !received.success || received.exitCode !== 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected command to succeed, but it failed with exit code ${received.exitCode}`
          : `Expected command to fail, but it succeeded`,
    };
  },

  toHaveExitCode(received: CliResult, expectedCode: number) {
    const pass = received.exitCode === expectedCode;
    return {
      pass,
      message: () =>
        pass
          ? `Exit code is ${expectedCode} as expected`
          : `Expected exit code ${expectedCode}, but got ${received.exitCode}`,
    };
  },

  toContainInOutput(received: CliResult, expected: string) {
    const output = received.cleanStdout + received.cleanStderr;
    const pass = output.includes(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Output contains "${expected}"`
          : `Expected output to contain "${expected}", but it didn't.\nOutput: ${output}`,
    };
  },

  toContainInStdout(received: CliResult, expected: string) {
    const pass = received.cleanStdout.includes(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Stdout contains "${expected}"`
          : `Expected stdout to contain "${expected}", but it didn't.\nStdout: ${received.cleanStdout}`,
    };
  },

  toContainInStderr(received: CliResult, expected: string) {
    const pass = received.cleanStderr.includes(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Stderr contains "${expected}"`
          : `Expected stderr to contain "${expected}", but it didn't.\nStderr: ${received.cleanStderr}`,
    };
  },

  toMatchPattern(received: CliResult, pattern: RegExp) {
    const output = received.cleanStdout + received.cleanStderr;
    const pass = pattern.test(output);
    return {
      pass,
      message: () =>
        pass
          ? `Output matches pattern ${pattern}`
          : `Expected output to match pattern ${pattern}, but it didn't.\nOutput: ${output}`,
    };
  },

  toHaveUserFriendlyError(received: CliResult) {
    const stderr = received.cleanStderr;
    const stdout = received.cleanStdout;

    // Check for technical jargon that shouldn't be in user-facing errors
    const hasTechnicalJargon =
      stderr.includes("Error: Error:") || // Nested errors
      stderr.includes("at Object.") || // Stack traces
      stderr.includes("node_modules/") || // Module paths
      stderr.includes("TypeError:") ||
      stderr.includes("ReferenceError:") ||
      stderr.includes("ZodError") ||
      stderr.includes("z.") ||
      stderr.includes('"extensions":') || // Raw GraphQL errors
      stderr.includes('"locations":') ||
      stderr.includes("SIGTERM") ||
      stderr.includes("killTimeout");

    // Check for positive indicators of user-friendly errors
    const hasUserFriendlyElements =
      stderr.length > 0 && // Has some error message
      !stderr.includes("undefined") && // No undefined values
      stderr.length < 2000; // Not excessively long

    const pass = !hasTechnicalJargon && hasUserFriendlyElements;

    return {
      pass,
      message: () =>
        pass
          ? "Error message is user-friendly"
          : `Error message contains technical jargon or is not user-friendly.\nStderr: ${stderr}\nStdout: ${stdout}`,
    };
  },

  toContainHelpfulSuggestions(received: CliResult) {
    const output = (received.cleanStderr + received.cleanStdout).toLowerCase();

    // Look for helpful keywords that indicate actionable guidance
    const helpfulKeywords = [
      "try",
      "check",
      "ensure",
      "verify",
      "make sure",
      "suggestion",
      "tip",
      "help",
      "guide",
      "see",
      "view",
      "list",
      "show",
      "configure",
      "set",
      "create",
      "add",
      "documentation",
      "docs",
      "example",
      "command",
      "run",
      "execute",
      "available",
      "valid",
      "supported",
    ];

    const hasSuggestions = helpfulKeywords.some((keyword) => output.includes(keyword));

    return {
      pass: hasSuggestions,
      message: () =>
        hasSuggestions
          ? "Output contains helpful suggestions"
          : `Expected output to contain helpful suggestions, but found none.\nOutput: ${output}`,
    };
  },

  toHaveConsistentErrorFormat(received: CliResult) {
    const stderr = received.cleanStderr;

    if (!stderr || stderr.trim().length === 0) {
      return {
        pass: false,
        message: () => "No error message found in stderr",
      };
    }

    // Check for consistent error formatting patterns
    const hasProperFormat =
      // Should not start with lowercase (unless it's a continuation)
      /^[A-Z]/.test(stderr.trim()) ||
      // Or should start with error indicator or progress indicator
      /^(Error:|❌|✗|Failed|-|✖)/.test(stderr.trim());

    // Check for proper sentence structure (allow periods at end of sentences)
    const lines = stderr.trim().split("\n");
    const properEnding = !lines.some((line) => {
      const trimmed = line.trim();
      // Allow periods for proper sentences and suggestion lines
      if (
        trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        trimmed.includes("flag") ||
        trimmed.includes("details") ||
        trimmed.match(/^\d+\./)
      ) {
        return false; // These are allowed to have periods
      }
      // Short fragments shouldn't end with period
      return trimmed.endsWith(".") && trimmed.split(" ").length < 3;
    });

    const pass = hasProperFormat && properEnding;

    return {
      pass,
      message: () =>
        pass
          ? "Error message has consistent formatting"
          : `Error message formatting is inconsistent.\nStderr: ${stderr}`,
    };
  },
};

// Extend Vitest's expect with custom matchers
declare module "vitest" {
  interface Assertion<T = any> {
    toHaveSucceeded(): void;
    toHaveFailed(): void;
    toHaveExitCode(code: number): void;
    toContainInOutput(text: string): void;
    toContainInStdout(text: string): void;
    toContainInStderr(text: string): void;
    toMatchPattern(pattern: RegExp): void;
    toHaveUserFriendlyError(): void;
    toContainHelpfulSuggestions(): void;
    toHaveConsistentErrorFormat(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveSucceeded(): void;
    toHaveFailed(): void;
    toHaveExitCode(code: number): void;
    toContainInOutput(text: string): void;
    toContainInStdout(text: string): void;
    toContainInStderr(text: string): void;
    toMatchPattern(pattern: RegExp): void;
    toHaveUserFriendlyError(): void;
    toContainHelpfulSuggestions(): void;
    toHaveConsistentErrorFormat(): void;
  }
}

// Assert that a configuration was successfully deployed
export function assertDeploymentSuccess(result: CliResult): void {
  expect(result).toHaveSucceeded();
  expect(result).toContainInOutput("Deployment completed");
}

// Assert that introspection was successful
export function assertIntrospectionSuccess(result: CliResult): void {
  expect(result).toHaveSucceeded();
  expect(result).toContainInOutput("Introspection completed");
}

// Assert that diff shows no changes
export function assertNoChanges(result: CliResult): void {
  expect(result).toHaveSucceeded();
  expect(result).toContainInOutput("No differences found");
}

// Assert that diff shows changes
export function assertHasChanges(result: CliResult): void {
  expect(result).toHaveSucceeded();
  expect(result).not.toContainInOutput("No differences found");
}

// Assert specific error messages
export function assertAuthenticationError(result: CliResult): void {
  expect(result).toHaveFailed();
  expect(result).toMatchPattern(/authentication|unauthorized|invalid token/i);
}

export function assertNetworkError(result: CliResult): void {
  expect(result).toHaveFailed();
  expect(result).toMatchPattern(/network|connection|ECONNREFUSED/i);
}

export function assertValidationError(result: CliResult): void {
  expect(result).toHaveFailed();
  expect(result).toMatchPattern(/validation|invalid|required/i);
}

// Assert configuration content
export function assertConfigContains(config: any, path: string, value: any): void {
  const keys = path.split(".");
  let current = config;

  for (const key of keys) {
    expect(current).toHaveProperty(key);
    current = current[key];
  }

  expect(current).toEqual(value);
}

// Assert array contains item with properties
export function assertArrayContainsItem(array: any[], properties: Record<string, any>): void {
  const found = array.some((item) =>
    Object.entries(properties).every(([key, value]) => item[key] === value)
  );

  if (!found) {
    throw new Error(`Array does not contain item with properties: ${JSON.stringify(properties)}`);
  }
}

// Assert command completed within time limit
export function assertCompletedWithin(result: CliResult, maxDuration: number): void {
  if (result.duration > maxDuration) {
    throw new Error(`Command took ${result.duration}ms, expected less than ${maxDuration}ms`);
  }
}

// Helper to create a custom assertion for specific output patterns
export function createOutputAssertion(patterns: {
  success?: string[];
  error?: string[];
  warning?: string[];
}) {
  return (result: CliResult) => {
    if (patterns.success) {
      for (const pattern of patterns.success) {
        expect(result).toContainInOutput(pattern);
      }
    }

    if (patterns.error && result.exitCode !== 0) {
      for (const pattern of patterns.error) {
        expect(result).toContainInStderr(pattern);
      }
    }

    if (patterns.warning) {
      for (const pattern of patterns.warning) {
        expect(result).toContainInOutput(pattern);
      }
    }
  };
}
