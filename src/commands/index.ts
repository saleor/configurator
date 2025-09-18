/**
 * Command Registry
 *
 * This file exports all available CLI commands and their configurations.
 * Commands are automatically registered in the CLI through this registry.
 */

export { buildCommandConfig } from "./build";
export { convertCommandConfig } from "./convert";
export { deployCommandConfig } from "./deploy";
export { diffCommandConfig } from "./diff";
export { previewCommandConfig } from "./preview";
export { introspectCommandConfig } from "./introspect";
export { startCommandConfig } from "./start";

import { buildCommandConfig } from "./build";
import { convertCommandConfig } from "./convert";
import { deployCommandConfig } from "./deploy";
import { diffCommandConfig } from "./diff";
import { previewCommandConfig } from "./preview";
import { introspectCommandConfig } from "./introspect";
import { startCommandConfig } from "./start";

/**
 * All available commands for the CLI
 * Add new commands here to automatically register them
 */
export const commands = [
  buildCommandConfig,
  convertCommandConfig,
  deployCommandConfig,
  diffCommandConfig,
  previewCommandConfig,
  introspectCommandConfig,
  startCommandConfig,
];
