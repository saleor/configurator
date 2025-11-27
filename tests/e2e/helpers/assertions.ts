import { expect } from "vitest";
import type { CliTestResult } from "./cli-test-runner";

/**
 * Custom matchers for CLI testing
 */
export const cliMatchers = {
  /**
   * Assert command succeeded
   */
  toSucceed(result: CliTestResult) {
    const pass = result.success && result.exitCode === 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected command to fail, but it succeeded`
          : `Expected command to succeed, but it failed with exit code ${result.exitCode}\nStderr: ${result.cleanStderr}`,
    };
  },

  /**
   * Assert command failed
   */
  toFail(result: CliTestResult) {
    const pass = !result.success || result.exitCode !== 0;
    return {
      pass,
      message: () =>
        pass
          ? `Expected command to succeed, but it failed with exit code ${result.exitCode}`
          : `Expected command to fail, but it succeeded`,
    };
  },

  /**
   * Assert command failed with specific exit code
   */
  toFailWithCode(result: CliTestResult, expectedCode: number) {
    const pass = result.exitCode === expectedCode;
    return {
      pass,
      message: () =>
        pass
          ? `Command failed with expected exit code ${expectedCode}`
          : `Expected exit code ${expectedCode}, but got ${result.exitCode}`,
    };
  },

  /**
   * Assert command timed out
   */
  toTimeout(result: CliTestResult) {
    const pass = result.timedOut;
    return {
      pass,
      message: () =>
        pass
          ? `Command timed out as expected`
          : `Expected command to timeout, but it completed with exit code ${result.exitCode}`,
    };
  },

  /**
   * Assert command was terminated by signal
   */
  toBeTerminated(result: CliTestResult) {
    const pass = result.isTerminated;
    return {
      pass,
      message: () =>
        pass
          ? `Command was terminated as expected`
          : `Expected command to be terminated, but it completed normally`,
    };
  },

  /**
   * Assert command was canceled
   */
  toBeCanceled(result: CliTestResult) {
    const pass = result.isCanceled;
    return {
      pass,
      message: () =>
        pass
          ? `Command was canceled as expected`
          : `Expected command to be canceled, but it completed normally`,
    };
  },

  /**
   * Assert command hit max buffer limit
   */
  toExceedBuffer(result: CliTestResult) {
    const pass = result.isMaxBuffer;
    return {
      pass,
      message: () =>
        pass
          ? `Command exceeded buffer limit as expected`
          : `Expected command to exceed buffer limit, but it completed normally`,
    };
  },

  /**
   * Assert stdout contains text
   */
  toHaveStdout(result: CliTestResult, expected: string | RegExp) {
    const matches =
      typeof expected === "string"
        ? result.cleanStdout.includes(expected)
        : expected.test(result.cleanStdout);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Stdout contains expected text`
          : `Expected stdout to contain "${expected}", but got:\n${result.cleanStdout}`,
    };
  },

  /**
   * Assert stderr contains text
   */
  toHaveStderr(result: CliTestResult, expected: string | RegExp) {
    const matches =
      typeof expected === "string"
        ? result.cleanStderr.includes(expected)
        : expected.test(result.cleanStderr);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Stderr contains expected text`
          : `Expected stderr to contain "${expected}", but got:\n${result.cleanStderr}`,
    };
  },

  /**
   * Assert command completed within duration
   */
  toCompleteWithin(result: CliTestResult, maxMs: number) {
    const pass = result.duration <= maxMs;
    return {
      pass,
      message: () =>
        pass
          ? `Command completed within ${maxMs}ms (${result.duration}ms)`
          : `Expected command to complete within ${maxMs}ms, but it took ${result.duration}ms`,
    };
  },

  /**
   * Assert command output matches snapshot
   */
  toMatchOutput(result: CliTestResult, snapshot: { stdout?: string; stderr?: string }) {
    const stdoutMatches = !snapshot.stdout || result.cleanStdout === snapshot.stdout;
    const stderrMatches = !snapshot.stderr || result.cleanStderr === snapshot.stderr;
    const pass = stdoutMatches && stderrMatches;
    return {
      pass,
      message: () => {
        if (pass) {
          return `Output matches snapshot`;
        }
        let message = `Output does not match snapshot:`;
        if (!stdoutMatches) {
          message += `\nStdout diff:\nExpected: ${snapshot.stdout}\nReceived: ${result.cleanStdout}`;
        }
        if (!stderrMatches) {
          message += `\nStderr diff:\nExpected: ${snapshot.stderr}\nReceived: ${result.cleanStderr}`;
        }
        return message;
      },
    };
  },
};

/**
 * Extend Vitest's expect with custom matchers
 */
declare module "vitest" {
  interface Assertion {
    toSucceed(): void;
    toFail(): void;
    toFailWithCode(code: number): void;
    toTimeout(): void;
    toBeTerminated(): void;
    toBeCanceled(): void;
    toExceedBuffer(): void;
    toHaveStdout(expected: string | RegExp): void;
    toHaveStderr(expected: string | RegExp): void;
    toCompleteWithin(ms: number): void;
    toMatchOutput(snapshot: { stdout?: string; stderr?: string }): void;
  }
  interface AsymmetricMatchersContaining {
    toSucceed(): void;
    toFail(): void;
    toFailWithCode(code: number): void;
    toTimeout(): void;
    toBeTerminated(): void;
    toBeCanceled(): void;
    toExceedBuffer(): void;
    toHaveStdout(expected: string | RegExp): void;
    toHaveStderr(expected: string | RegExp): void;
    toCompleteWithin(ms: number): void;
    toMatchOutput(snapshot: { stdout?: string; stderr?: string }): void;
  }
}

// Register custom matchers
expect.extend(cliMatchers);

/**
 * Common test assertions
 */
export const CliAssertions = {
  /**
   * Assert successful command execution
   */
  expectSuccess(result: CliTestResult, context?: string) {
    expect(result.timedOut).toBe(false);
    expect(
      result.exitCode,
      context ? `${context}: ${result.cleanStderr}` : result.cleanStderr
    ).toBe(0);
    expect(result.success).toBe(true);
  },

  /**
   * Assert command failure
   */
  expectFailure(result: CliTestResult, expectedCode?: number) {
    expect(result.success).toBe(false);
    if (expectedCode !== undefined) {
      expect(result.exitCode).toBe(expectedCode);
    } else {
      expect(result.exitCode).not.toBe(0);
    }
  },

  /**
   * Assert command output contains text
   */
  expectOutput(
    result: CliTestResult,
    expected: string | RegExp,
    stream: "stdout" | "stderr" = "stdout"
  ) {
    const output = stream === "stdout" ? result.cleanStdout : result.cleanStderr;
    if (typeof expected === "string") {
      expect(output).toContain(expected);
    } else {
      expect(output).toMatch(expected);
    }
  },

  /**
   * Assert command output does not contain text
   */
  expectNoOutput(
    result: CliTestResult,
    unexpected: string | RegExp,
    stream: "stdout" | "stderr" = "stdout"
  ) {
    const output = stream === "stdout" ? result.cleanStdout : result.cleanStderr;
    if (typeof unexpected === "string") {
      expect(output).not.toContain(unexpected);
    } else {
      expect(output).not.toMatch(unexpected);
    }
  },

  /**
   * Assert command completed quickly
   */
  expectFastCompletion(result: CliTestResult, maxMs: number = 5000) {
    expect(result.duration).toBeLessThan(maxMs);
  },

  /**
   * Assert validation error
   */
  expectValidationError(result: CliTestResult) {
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(4); // Validation error code
    expect(result.cleanStderr.toLowerCase()).toMatch(/validation/i);
  },

  /**
   * Assert permission error
   */
  expectPermissionError(result: CliTestResult) {
    expect(result.success).toBe(false);
    expect(result.cleanStderr.toLowerCase()).toMatch(/(permission|unauthorized|forbidden|token)/i);
  },

  /**
   * Assert network error
   */
  expectNetworkError(result: CliTestResult) {
    expect(result.success).toBe(false);
    expect(result.cleanStderr.toLowerCase()).toMatch(
      /(network|connection|timeout|enotfound|econnrefused)/i
    );
  },

  /**
   * Assert file system error
   */
  expectFileSystemError(result: CliTestResult) {
    expect(result.success).toBe(false);
    expect(result.cleanStderr.toLowerCase()).toMatch(
      /(enoent|eacces|eisdir|enotdir|file|directory)/i
    );
  },

  /**
   * Assert configuration error
   */
  expectConfigError(result: CliTestResult) {
    expect(result.success).toBe(false);
    expect(result.cleanStderr.toLowerCase()).toMatch(/(config|configuration|yaml|invalid)/i);
  },
};

/**
 * Test helpers for common patterns
 */
export const testHelpers = {
  /**
   * Wait for condition
   */
  async waitFor(
    condition: () => boolean | Promise<boolean>,
    options: {
      timeout?: number;
      interval?: number;
      message?: string;
    } = {}
  ): Promise<void> {
    const timeout = options.timeout ?? 10000;
    const interval = options.interval ?? 100;
    const message = options.message ?? "Condition not met";
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`${message} (timeout after ${timeout}ms)`);
  },

  /**
   * Retry operation
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: {
      retries?: number;
      delay?: number;
      backoff?: number;
    } = {}
  ): Promise<T> {
    const retries = options.retries ?? 3;
    const delay = options.delay ?? 1000;
    const backoff = options.backoff ?? 2;
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (i < retries) {
          await new Promise((resolve) => setTimeout(resolve, delay * backoff ** i));
        }
      }
    }

    throw lastError;
  },

  /**
   * Measure execution time
   */
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    return { result, duration };
  },
};
