/**
 * CLI Display Utilities
 *
 * This module handles display and output formatting for CLI commands,
 * including configuration display, progress indicators, and logging setup.
 */

/**
 * Common configuration interface for command arguments
 */
export interface BaseCommandArgs {
  url: string;
  token: string;
  config: string;
  quiet: boolean;
  verbose: boolean;
}

/**
 * Sets up logger level based on command flags
 * @param verbose - Enable verbose/debug logging
 * @param quiet - Enable quiet mode (errors only)
 */
export function setupLogger(verbose: boolean, quiet: boolean): void {
  if (verbose) {
    process.env.LOG_LEVEL = "debug";
  } else if (quiet) {
    process.env.LOG_LEVEL = "error";
  }
}

/**
 * Displays configuration information in a consistent format
 * @param args - Command arguments containing configuration
 * @param quiet - Whether to suppress output
 */
export function displayConfig(args: BaseCommandArgs & Record<string, any>, quiet: boolean): void {
  if (quiet) return;

  console.log("📋 Configuration:");
  console.log(`   URL: ${args.url}`);
  console.log(`   Config: ${args.config}`);

  // Display additional args (format, filter, etc.)
  Object.entries(args).forEach(([key, value]) => {
    if (!["url", "token", "config", "quiet", "verbose"].includes(key) && value !== undefined) {
      console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
    }
  });

  console.log("");
}

/**
 * Displays a progress indicator
 * @param message - Progress message to display
 * @param quiet - Whether to suppress output
 */
export function displayProgress(message: string, quiet: boolean): void {
  if (!quiet) {
    console.log(message);
  }
}

/**
 * Displays a success message
 * @param message - Success message to display
 * @param quiet - Whether to suppress output
 */
export function displaySuccess(message: string, quiet: boolean): void {
  if (!quiet) {
    console.log(`✅ ${message}`);
  }
}

/**
 * Displays a warning message
 * @param message - Warning message to display
 * @param quiet - Whether to suppress output
 */
export function displayWarning(message: string, quiet: boolean): void {
  if (!quiet) {
    console.warn(`⚠️  ${message}`);
  }
}
