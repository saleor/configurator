/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { diffCommandConfig } from "./diff";
export { introspectCommandConfig } from "./introspect";
export { pushCommandConfig } from "./push";
export { startCommandConfig } from "./start";

import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
// Command imports for registry
import { pushCommandConfig } from "./push";
import { startCommandConfig } from "./start";

/**
 * All available commands for the CLI
 * Add new commands here to automatically register them
 */
export const commands = [
  pushCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
];
