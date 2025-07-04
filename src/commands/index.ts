/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { diffCommandConfig } from "./diff";
export { interactiveCommandConfig } from "./interactive";
export { introspectCommandConfig } from "./introspect";
// Command exports
export { pushCommandConfig } from "./push";

import { diffCommandConfig } from "./diff";
import { interactiveCommandConfig } from "./interactive";
import { introspectCommandConfig } from "./introspect";
// Command imports for registry
import { pushCommandConfig } from "./push";

/**
 * All available commands for the CLI
 * Add new commands here to automatically register them
 */
export const commands = [
  pushCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  interactiveCommandConfig,
];
