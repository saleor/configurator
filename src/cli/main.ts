#!/usr/bin/env node

import { Command } from '@commander-js/extra-typings';
import chalk from 'chalk';
import { createCommand, selectOption } from './command';
import { commands, commandOptions } from '../commands';

const CLI_CONFIG = {
  name: 'configurator',
  description: '🛒 Saleor Configuration Management Tool',
  version: '0.3.0'
} as const;

const INTERACTIVE_CHOICES = [
  { name: '📥 Download configuration from Saleor (introspect)', value: 'introspect' },
  { name: '📤 Upload configuration to Saleor (push)', value: 'push' },
  { name: '🔍 Compare local and remote configurations (diff)', value: 'diff' }
];

function registerCommands(program: Command): void {
  for (const commandConfig of commands) {
    const command = createCommand(commandConfig as any);
    
    const commandName = commandConfig.name as keyof typeof commandOptions;
    const options = commandOptions[commandName];
    
    if (options?.length > 0) {
      options.forEach(option => {
        command.option(option.flags, option.description, option.defaultValue);
      });
    }
    
    program.addCommand(command);
  }
}

function createInteractiveCommand(): Command {
  return new Command()
    .name('interactive')
    .alias('setup')
    .description('🔧 Interactive setup wizard for first-time users')
    .action(async () => {
      await runInteractiveSetup();
    });
}

async function runInteractiveSetup(): Promise<void> {
  console.log(chalk.blue.bold('🔧 Welcome to Saleor Configurator Setup!\n'));
  
  const selectedAction = await selectOption(
    'What would you like to do?',
    INTERACTIVE_CHOICES
  );
  
  console.log(chalk.green(`\n✨ Starting ${selectedAction} in interactive mode...\n`));
  
  const program = createCLI();
  const targetCommand = program.commands.find(cmd => cmd.name() === selectedAction);
  
  if (targetCommand) {
    await targetCommand.parseAsync([], { from: 'user' });
  }
}

function setupErrorHandling(program: Command): void {
  program.exitOverride((err) => {
    if (isHelpOrVersionRequest(err)) {
      console.log(err.message);
      process.exit(0);
    }
    
    console.error(chalk.red(`❌ ${err.message}`));
    process.exit(err.exitCode || 1);
  });
}

function isHelpOrVersionRequest(error: any): boolean {
  return error.code === 'commander.help' || error.code === 'commander.version';
}

function addHelpContent(program: Command): void {
  program.addHelpText('before', chalk.blue.bold('🛒 Saleor Configuration Management Tool\n'));
  program.addHelpText('after', buildHelpText());
}

function buildHelpText(): string {
  return `
${chalk.bold('Quick Start:')}
  ${chalk.gray('# First time? Use the interactive setup:')}
  ${chalk.cyan('configurator interactive')}
  
  ${chalk.gray('# Or run commands directly:')}
  ${chalk.cyan('configurator push -u <url> -t <token>')}
  
${chalk.bold('Tips:')}
  ${chalk.gray('• Use short flags:')} ${chalk.cyan('-u')} for URL, ${chalk.cyan('-t')} for token, ${chalk.cyan('-c')} for config
  ${chalk.gray('• Run without arguments for interactive prompts')}
  ${chalk.gray('• Use')} ${chalk.cyan('--help')} ${chalk.gray('on any command for detailed options')}
`;
}

function createCLI(): Command {
  const program = new Command()
    .name(CLI_CONFIG.name)
    .description(CLI_CONFIG.description)
    .version(CLI_CONFIG.version)
    .configureOutput({
      outputError: (str, write) => write(chalk.red(str))
    });

  registerCommands(program);
  program.addCommand(createInteractiveCommand());
  setupErrorHandling(program);
  addHelpContent(program);

  return program;
}

async function handleCliError(error: unknown): Promise<void> {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    console.log(chalk.yellow('\n👋 Goodbye!'));
    process.exit(0);
  }
  
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(chalk.red(`❌ ${errorMessage}`));
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