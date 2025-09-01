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
  }
  interface AsymmetricMatchersContaining {
    toHaveSucceeded(): void;
    toHaveFailed(): void;
    toHaveExitCode(code: number): void;
    toContainInOutput(text: string): void;
    toContainInStdout(text: string): void;
    toContainInStderr(text: string): void;
    toMatchPattern(pattern: RegExp): void;
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
export function assertArrayContainsItem(
  array: any[],
  properties: Record<string, any>
): void {
  const found = array.some((item) =>
    Object.entries(properties).every(([key, value]) => item[key] === value)
  );
  
  expect(found).toBe(
    true,
    `Array does not contain item with properties: ${JSON.stringify(properties)}`
  );
}

// Assert command completed within time limit
export function assertCompletedWithin(result: CliResult, maxDuration: number): void {
  expect(result.duration).toBeLessThanOrEqual(
    maxDuration,
    `Command took ${result.duration}ms, expected less than ${maxDuration}ms`
  );
}

// Helper to create a custom assertion for specific output patterns
export function createOutputAssertion(
  patterns: { success?: string[]; error?: string[]; warning?: string[] }
) {
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