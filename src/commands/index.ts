/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { deployCommandConfig } from "./deploy";
export { diffCommandConfig } from "./diff";
export { introspectCommandConfig } from "./introspect";
export { createRecipeCommand } from "./recipe";
export { startCommandConfig } from "./start";

import { deployCommandConfig } from "./deploy";
import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
import { createRecipeCommand } from "./recipe";
import { startCommandConfig } from "./start";

/**
 * All available commands for the CLI (using CommandConfig pattern)
 * Add new commands here to automatically register them
 */
export const commands = [
  deployCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
];

/**
 * Commands that use the subcommand pattern (Commander.js Command instances)
 * These are registered directly via program.addCommand()
 */
export const subcommandCreators = [createRecipeCommand];
