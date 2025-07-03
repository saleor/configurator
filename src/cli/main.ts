#!/usr/bin/env node

import { Command, type CommanderError } from "@commander-js/extra-typings";
import { commandOptions, commands } from "../commands";
import { type CommandConfig, createCommand, selectOption } from "./command";
import { cliConsole } from "./console";

const CLI_CONFIG = {
  name: "configurator",
  description: "🛒 Saleor Configuration Management Tool",
  version: "0.3.0",
} as const;

const INTERACTIVE_CHOICES = [
  {
    name: "📥 Download configuration from Saleor (introspect)",
    value: "introspect",
  },
  { name: "📤 Upload configuration to Saleor (push)", value: "push" },
  { name: "🔍 Compare local and remote configurations (diff)", value: "diff" },
];

function registerCommands(program: Command): void {
  for (const commandConfig of commands) {
    const command = createCommand(
      commandConfig as CommandConfig<typeof commandConfig.schema>
    );

    const commandName = commandConfig.name as keyof typeof commandOptions;
    const options = commandOptions[commandName];

    if (options?.length > 0) {
      options.forEach((option) => {
        command.option(option.flags, option.description, option.defaultValue);
      });
    }

    program.addCommand(command);
  }
}

function createInteractiveCommand(): Command {
  return new Command()
    .name("interactive")
    .alias("setup")
    .description("🔧 Interactive setup wizard for first-time users")
    .action(async () => {
      await runInteractiveSetup();
    });
}

async function runInteractiveSetup(): Promise<void> {
  cliConsole.header("🔧 Welcome to Saleor Configurator Setup!\n");

  const selectedAction = await selectOption(
    "What would you like to do?",
    INTERACTIVE_CHOICES
  );

  cliConsole.info(`\n✨ Starting ${selectedAction} in interactive mode...\n`);

  const program = createCLI();
  const targetCommand = program.commands.find(
    (cmd) => cmd.name() === selectedAction
  );

  if (targetCommand) {
    await targetCommand.parseAsync([], { from: "user" });
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
    cliConsole.important("🛒 Saleor Configuration Management Tool\n")
  );
  program.addHelpText("after", buildHelpText());
}

function buildHelpText(): string {
  return `
${cliConsole.important("Quick Start:")}
  ${cliConsole.hint("# First time? Use the interactive setup:")}
  ${cliConsole.code("configurator interactive")}
  
  ${cliConsole.hint("# Or run commands directly:")}
  ${cliConsole.code("configurator push -u <url> -t <token>")}
  
${cliConsole.important("Tips:")}
  ${cliConsole.hint("• Use short flags:")} ${cliConsole.code(
    "-u"
  )} for URL, ${cliConsole.code("-t")} for token, ${cliConsole.code(
    "-c"
  )} for config
  ${cliConsole.hint("• Run without arguments for interactive prompts")}
  ${cliConsole.hint("• Use")} ${cliConsole.code("--help")} ${cliConsole.hint(
    "on any command for detailed options"
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
  program.addCommand(createInteractiveCommand());
  setupErrorHandling(program);
  addHelpContent(program);

  return program;
}

async function handleCliError(error: unknown): Promise<void> {
  if (error instanceof Error && error.name === "ExitPromptError") {
    cliConsole.info("\n👋 Goodbye!");
    process.exit(0);
  }

  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  cliConsole.error(errorMessage);
  process.exit(1);
}

export async function runCLI(): Promise<void> {
  const program = createCLI();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    await handleCliError(error);
  }
}

runCLI();
