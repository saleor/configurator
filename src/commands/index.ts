/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { diffCommandConfig } from "./diff";
export { introspectCommandConfig } from "./introspect";
export { deployCommandConfig } from "./deploy";
export { startCommandConfig } from "./start";

import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
import { deployCommandConfig } from "./deploy";
import { startCommandConfig } from "./start";

/**
 * All available commands for the CLI
 * Add new commands here to automatically register them
 */
export const commands = [
  deployCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
];
