#!/usr/bin/env node

import { Command, type CommanderError } from "@commander-js/extra-typings";
import packageJson from "../../package.json";
import { commands } from "../commands/index.js";
import { BaseError } from "../lib/errors/shared";
import { logger } from "../lib/logger";
import { COMMAND_NAME } from "../meta";
import { type CommandConfig, createCommand } from "./command";
import { cliConsole } from "./console";

export type CommandOption = {
  flags: string;
  description: string;
  defaultValue: boolean | string | undefined;
};

const CLI_CONFIG = {
  name: "configurator",
  description: "🛒 Saleor Configuration Management Tool",
  version: packageJson.version,
} as const;

function registerCommands(program: Command): void {
  for (const commandConfig of commands) {
    const command = createCommand(
      commandConfig as CommandConfig<typeof commandConfig.schema>
    );

    program.addCommand(command);
  }
}

function setupErrorHandling(program: Command): void {
  program.exitOverride((err) => {
    if (isHelpOrVersionRequest(err)) {
      cliConsole.error(err.message);
      process.exit(0);
    }

    cliConsole.error(err.message);
    process.exit(err.exitCode || 1);
  });
}

function isHelpOrVersionRequest(error: CommanderError): boolean {
  return error.code === "commander.help" || error.code === "commander.version";
}

function addHelpContent(program: Command): void {
  program.addHelpText(
    "before",
    cliConsole.important("✨ Saleor Configurator ✨\n")
  );
  program.addHelpText("after", buildHelpText());
}

function buildHelpText(): string {
  return `
${cliConsole.important("Quick Start:")}
  ${cliConsole.hint("‧ First time? Use the interactive setup:")}
  ${cliConsole.code(`${COMMAND_NAME} start`)}
  
  ${cliConsole.hint("‧ Or run commands directly:")}
  ${cliConsole.code(
    `${COMMAND_NAME} deploy --url https://your-store.saleor.cloud/graphql/ --token your-app-token \n`
  )}
`;
}

function createCLI(): Command {
  const program = new Command()
    .name(CLI_CONFIG.name)
    .description(CLI_CONFIG.description)
    .version(CLI_CONFIG.version)
    .configureOutput({
      outputError: (str, write) => write(cliConsole.error(str)),
    });

  registerCommands(program);
  setupErrorHandling(program);
  addHelpContent(program);

  return program;
}

async function handleCliError(error: unknown): Promise<void> {
  if (error instanceof Error && error.name === "ExitPromptError") {
    cliConsole.info("\n👋 Goodbye!");
    process.exit(0);
  }

  // Log the full error for debugging
  logger.error("CLI error occurred", { error });

  // Display user-friendly error message
  if (error instanceof BaseError) {
    cliConsole.error(error);
  } else if (error instanceof Error) {
    cliConsole.error(error.message);
  } else {
    cliConsole.error("An unexpected error occurred");
  }

  process.exit(1);
}

// Global error handlers
process.on("uncaughtException", (error: Error) => {
  logger.fatal("Uncaught Exception:", error);
  cliConsole.error(
    "💥 An unexpected error occurred. Please report this issue."
  );

  if (process.env.NODE_ENV === "development") {
    console.error(error.stack);
  }

  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal("Unhandled Promise Rejection:", reason);

  if (reason instanceof BaseError) {
    cliConsole.error(reason);
  } else if (reason instanceof Error) {
    cliConsole.error(`💥 Unhandled error: ${reason.message}`);
  } else {
    cliConsole.error("💥 An unhandled promise rejection occurred");
  }

  if (process.env.NODE_ENV === "development") {
    console.error(reason);
  }

  process.exit(1);
});

export async function runCLI(): Promise<void> {
  const program = createCLI();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    await handleCliError(error);
  }
}

// Only run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}
