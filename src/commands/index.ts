/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { deployCommandConfig } from "./deploy";
export { diffCommandConfig } from "./diff";
export { introspectCommandConfig } from "./introspect";
export { startCommandConfig } from "./start";

import { deployCommandConfig } from "./deploy";
import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
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
