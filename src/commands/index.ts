/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { diffCommandConfig } from "./diff";
export { introspectCommandConfig } from "./introspect";
// Command exports
export { pushCommandConfig, pushCommandOptions } from "./push";

import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
// Command imports for registry
import { pushCommandConfig, pushCommandOptions } from "./push";

/**
 * All available commands for the CLI
 * Add new commands here to automatically register them
 */
export const commands = [
  pushCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
];

/**
 * Command-specific options that need to be added to Commander.js
 * Maps command names to their additional option configurations
 */
export const commandOptions = {
  push: pushCommandOptions,
  diff: [],
  introspect: [],
} as const;
