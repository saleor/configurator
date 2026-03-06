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
export { schemaCommandConfig } from "./schema";
export { startCommandConfig } from "./start";
export { validateCommandConfig } from "./validate";

import { deployCommandConfig } from "./deploy";
import { diffCommandConfig } from "./diff";
import { introspectCommandConfig } from "./introspect";
import { createRecipeCommand } from "./recipe";
import { schemaCommandConfig } from "./schema";
import { startCommandConfig } from "./start";
import { validateCommandConfig } from "./validate";

/**
 * All available commands for the CLI (using CommandConfig pattern)
 * Add new commands here to automatically register them
 */
export const commands = [
  deployCommandConfig,
  diffCommandConfig,
  introspectCommandConfig,
  schemaCommandConfig,
  startCommandConfig,
  validateCommandConfig,
];

/**
 * Commands that use the subcommand pattern (Commander.js Command instances)
 * These are registered directly via program.addCommand()
 */
export const subcommandCreators = [createRecipeCommand];
