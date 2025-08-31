import { ErrorRecoveryGuide } from "../../lib/errors/recovery-guide";

/**
 * Exit codes for different error types
 */
export const EXIT_CODES = {
  UNEXPECTED: 1,
  AUTHENTICATION: 2,
  NETWORK: 3,
  VALIDATION: 4,
  PARTIAL_FAILURE: 5,
} as const;

/**
 * Base class for all deployment-related errors
 * Provides structured error information with actionable suggestions
 */
export abstract class DeploymentError extends Error {
  constructor(
    message: string,
    public readonly suggestions: readonly string[],
    public readonly context?: Record<string, unknown>,
    public readonly originalError?: Error | unknown
  ) {
    super(message);
    this.name = this.constructor.name;

    // Preserve stack trace from original error if available
    if (originalError instanceof Error && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  /**
   * Get the appropriate exit code for this error type
   */
  abstract getExitCode(): number;

  /**
   * Get a user-friendly error message with suggestions
   */
  getUserMessage(_verbose = false): string {
    const lines: string[] = [`❌ Deployment failed: ${this.getErrorType()}`, "", this.message];

    if (this.context && Object.keys(this.context).length > 0) {
      lines.push("", "Details:");
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`  • ${key}: ${value}`);
      }
    }

    if (this.suggestions.length > 0) {
      lines.push("", "Suggested actions:");
      this.suggestions.forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
    }

    if (_verbose && this.originalError) {
      lines.push("", "Original error:", String(this.originalError));
    } else if (!_verbose) {
      lines.push("", "For more details, run with --verbose flag.");
    }

    return lines.join("\n");
  }

  /**
   * Get a short description of the error type
   */
  protected abstract getErrorType(): string;
}

/**
 * Network-related deployment errors
 */
export class NetworkDeploymentError extends DeploymentError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error | unknown) {
    const suggestions = [
      "Check your internet connection",
      "Verify the Saleor instance URL is correct",
      "Ensure the Saleor instance is running and accessible",
      "Check if you're behind a proxy or firewall",
    ];

    super(message, suggestions, context, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.NETWORK;
  }

  protected getErrorType(): string {
    return "Network Error";
  }
}

/**
 * Authentication and permission errors
 */
export class AuthenticationDeploymentError extends DeploymentError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error | unknown) {
    const suggestions = [
      "Verify your API token is correct: --token YOUR_TOKEN",
      "Check token permissions in Saleor dashboard",
      "Generate a new token if the current one is expired",
      "Ensure the token has the required permissions for this operation",
    ];

    super(message, suggestions, context, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.AUTHENTICATION;
  }

  protected getErrorType(): string {
    return "Authentication Error";
  }
}

/**
 * Configuration validation errors
 */
export class ValidationDeploymentError extends DeploymentError {
  constructor(
    message: string,
    validationErrors: readonly string[],
    context?: Record<string, unknown>,
    originalError?: Error | unknown
  ) {
    const suggestions = [
      "Review the validation errors above",
      "Check your configuration file for syntax errors",
      "Ensure all required fields are present",
      "Validate your configuration with 'saleor-configurator diff'",
    ];

    // Add validation errors to context
    const enhancedContext = {
      ...context,
      validationErrors: validationErrors.join(", "),
    };

    super(message, suggestions, enhancedContext, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.VALIDATION;
  }

  protected getErrorType(): string {
    return "Validation Error";
  }
}

/**
 * Stage-level aggregate error for better error reporting
 */
export class StageAggregateError extends DeploymentError {
  constructor(
    stageName: string,
    public readonly failures: Array<{
      entity: string;
      error: Error;
    }>,
    public readonly successes: string[] = []
  ) {
    
    const summary = `${stageName} failed for ${failures.length} of ${failures.length + successes.length} entities`;
    
    const suggestions = [
      "Review the individual errors below",
      "Fix the issues and run deploy again",
      "Use --include flag to deploy only specific entities",
      "Run 'saleor-configurator diff' to check current state",
    ];

    super(summary, suggestions, {
      stageName,
      totalEntities: failures.length + successes.length,
      failedCount: failures.length,
      successCount: successes.length,
    });
  }

  getExitCode(): number {
    return EXIT_CODES.PARTIAL_FAILURE;
  }

  protected getErrorType(): string {
    return "Stage Execution Failure";
  }

  getUserMessage(_verbose = false): string {
    const lines: string[] = [
      `❌ ${this.context?.stageName} - ${this.failures.length} of ${
        this.failures.length + this.successes.length
      } failed`,
      "",
    ];

    // Show successes if any
    if (this.successes.length > 0) {
      lines.push("✅ Successful:");
      this.successes.forEach((entity) => {
        lines.push(`  • ${entity}`);
      });
      lines.push("");
    }

    // Show failures with recovery suggestions
    if (this.failures.length > 0) {
      lines.push("❌ Failed:");
      this.failures.forEach(({ entity, error }) => {
        lines.push(`  • ${entity}`);
        lines.push(`    Error: ${error.message}`);
        
        // Get recovery suggestions for this specific error
        const suggestions = ErrorRecoveryGuide.getSuggestions(error.message);
        const formattedSuggestions = ErrorRecoveryGuide.formatSuggestions(suggestions);
        
        if (formattedSuggestions.length > 0) {
          formattedSuggestions.forEach((suggestion) => {
            lines.push(`    ${suggestion}`);
          });
        }
        
        lines.push("");
      });
    }

    // Add general suggestions
    if (this.suggestions.length > 0) {
      lines.push("General suggestions:");
      this.suggestions.forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
    }

    lines.push("", "Run 'saleor-configurator deploy --verbose' for detailed error traces");

    return lines.join("\n");
  }
}

/**
 * Partial deployment failure errors
 */
export class PartialDeploymentError extends DeploymentError {
  constructor(
    message: string,
    public readonly completedOperations: readonly string[],
    public readonly failedOperations: readonly { operation: string; error: string }[],
    context?: Record<string, unknown>,
    originalError?: Error | unknown
  ) {
    const suggestions = [
      "Review the failed operations above",
      "Fix the issues and run deploy again to retry failed operations",
      "Check Saleor logs for more details",
      "Consider running 'saleor-configurator diff' to see current state",
    ];

    // Add operation details to context
    const enhancedContext = {
      ...context,
      completedCount: completedOperations.length,
      failedCount: failedOperations.length,
    };

    super(message, suggestions, enhancedContext, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.PARTIAL_FAILURE;
  }

  protected getErrorType(): string {
    return "Partial Deployment Failure";
  }

  getUserMessage(_verbose = false): string {
    const baseMessage = super.getUserMessage(_verbose);
    const lines = baseMessage.split("\n");

    // Insert operation status after the main error message
    const insertIndex = lines.findIndex((line) => line === "Details:") + 2;

    if (this.completedOperations.length > 0) {
      lines.splice(insertIndex, 0, "", "✅ Completed operations:");
      this.completedOperations.forEach((op) => {
        lines.splice(insertIndex + 2, 0, `  • ${op}`);
      });
    }

    if (this.failedOperations.length > 0) {
      lines.splice(
        insertIndex +
          (this.completedOperations.length > 0 ? this.completedOperations.length + 3 : 0),
        0,
        "",
        "❌ Failed operations:"
      );
      this.failedOperations.forEach(({ operation, error }) => {
        lines.splice(
          insertIndex +
            (this.completedOperations.length > 0 ? this.completedOperations.length + 5 : 2),
          0,
          `  • ${operation}: ${error}`
        );
      });
    }

    return lines.join("\n");
  }
}

/**
 * Generic deployment error for unexpected failures
 */
export class UnexpectedDeploymentError extends DeploymentError {
  constructor(message: string, originalError?: Error | unknown) {
    const suggestions = [
      "Check the error message above for clues",
      "Run with --verbose flag for more details",
      "Check if this is a known issue on GitHub",
      "Report this issue if it persists",
    ];

    super(message, suggestions, undefined, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.UNEXPECTED;
  }

  protected getErrorType(): string {
    return "Unexpected Error";
  }
}

/**
 * Helper to convert various error types to DeploymentError
 */
export function toDeploymentError(error: unknown, operation = "deployment"): DeploymentError {
  // Already a DeploymentError
  if (error instanceof DeploymentError) {
    return error;
  }

  // GraphQL errors with specific handling
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Configuration file errors
    if (
      errorMessage.includes("configuration file not found") ||
      errorMessage.includes("failed to load") ||
      (errorMessage.includes("config") && errorMessage.includes("not found")) ||
      errorMessage.includes("implicit keys") ||
      errorMessage.includes("yaml") ||
      errorMessage.includes("expected schema")
    ) {
      return new ValidationDeploymentError(
        "Configuration file error",
        [error.message],
        { operation },
        error
      );
    }

    // Network errors
    if (
      errorMessage.includes("fetch failed") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("etimedout") ||
      errorMessage.includes("network") ||
      errorMessage.includes("enotfound")
    ) {
      return new NetworkDeploymentError(
        "Unable to connect to Saleor instance",
        { operation },
        error
      );
    }

    // Authentication errors
    if (
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("permission") ||
      errorMessage.includes("forbidden") ||
      errorMessage.includes("invalid token")
    ) {
      return new AuthenticationDeploymentError("Authentication failed", { operation }, error);
    }

    // Validation errors
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required")
    ) {
      return new ValidationDeploymentError(
        "Configuration validation failed",
        [error.message],
        { operation },
        error
      );
    }
  }

  // Fallback to unexpected error
  return new UnexpectedDeploymentError(`Unexpected error during ${operation}`, error);
}
