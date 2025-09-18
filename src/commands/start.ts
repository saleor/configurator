import { existsSync } from "node:fs";
import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { confirmAction, promptForMissingArgs, selectOption } from "../cli/command";
import { cliConsole } from "../cli/console";
import { ensureTsConfigPath } from "../modules/config/utils";

const DEFAULT_STACK_PATH = "config/stack.ts";

export const startCommandSchema = z.object({
  config: z
    .string()
    .default(DEFAULT_STACK_PATH)
    .describe("Configuration file path (TypeScript by default)"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type StartCommandArgs = z.infer<typeof startCommandSchema>;

const RETURNING_USER_CHOICES = [
  {
    name: "⬇️  Download fresh configuration from your store (`introspect`)",
    value: "introspect",
    description: "Update your local config with the latest from your store",
  },
  {
    name: "🔍 Compare local config with your live store (`diff`)",
    value: "diff",
    description: "See what would change without making any updates",
  },
  {
    name: "🚀 Apply your local changes to your store (`deploy`)",
    value: "deploy",
    description: "Push your TypeScript configuration changes to your live store",
  },
];

function showWelcomeMessage(): void {
  cliConsole.header("✨ Welcome to Saleor Configurator! ✨\n");

  cliConsole.info(
    "Saleor Configurator helps you manage your e-commerce store configuration as code."
  );
  cliConsole.info("Think of it as 'infrastructure as code' but for your commerce settings.\n");

  cliConsole.info("With Configurator, you can:");
  cliConsole.info("👉 Keep your store configuration in version control");
  cliConsole.info("👉 Apply the same settings across multiple environments");
  cliConsole.info("👉 Track changes to your store setup over time");
  cliConsole.info("👉 Collaborate on store configuration with your team\n");

  cliConsole.subtitle("💡 Recommended workflow");
  cliConsole.info(
    `   • Scaffold a TypeScript workspace with ${cliConsole.code("configurator init --ts")}`
  );
  cliConsole.info(
    `   • Introspect into ${cliConsole.code("config/stack.ts")} using ${cliConsole.code(
      "configurator introspect --layout sections"
    )}`
  );
  cliConsole.info(
    `   • Validate with ${cliConsole.code("configurator build --watch")} and ${cliConsole.code(
      "configurator preview"
    )}\n`
  );
}

function isFirstTimeUser(configPath: string = DEFAULT_STACK_PATH): boolean {
  return !existsSync(configPath);
}

async function runFirstTimeSetup(configPath: string): Promise<void> {
  showWelcomeMessage();

  cliConsole.subtitle("🎯 Let's get you started!\n");
  cliConsole.info(
    "Since you don't have an existing configuration, we'll scaffold one and download your store's current state."
  );
  cliConsole.info(
    `Run ${cliConsole.code("configurator init --ts")} any time to re-generate helpers, then` +
      ` connect to your Saleor instance to populate ${cliConsole.path(configPath)}.\n`
  );

  const shouldContinue = await confirmAction(
    "Ready to connect to your Saleor store and download your configuration?",
    "You'll be asked for your store URL and API token next.",
    true
  );

  if (!shouldContinue) {
    cliConsole.info("\n👋 No problem! Run 'configurator start' again when you're ready.");
    return;
  }

  cliConsole.info("");
  await executeCommand("introspect", configPath);
}

async function runReturningUserSetup(configPath: string): Promise<void> {
  cliConsole.info("\n"); // Add some breathing room from CLI help
  cliConsole.header("🔧 Saleor Configurator\n");
  cliConsole.info(
    `I see you have a ${cliConsole.path(configPath)} file. What would you like to do?\n`
  );

  const selectedAction = await selectOption("Choose an action:", RETURNING_USER_CHOICES);

  cliConsole.info(`\n✨ Starting ${selectedAction}...\n`);
  await executeCommand(selectedAction, configPath);
}

async function executeCommand(commandName: string, configPath: string): Promise<void> {
  const isFirstTime = isFirstTimeUser(configPath);
  const tsConfigPath = ensureTsConfigPath(configPath);

  // Import the commands dynamically to avoid circular dependencies
  const { commands } = await import("./index");
  const targetCommand = commands.find((cmd) => cmd.name === commandName);

  if (targetCommand) {
    // Create a minimal CLI program for the selected command
    const { Command } = await import("@commander-js/extra-typings");
    const { createCommand } = await import("../cli/command");

    const program = new Command();
    const command = createCommand(targetCommand as CommandConfig<typeof targetCommand.schema>);
    program.addCommand(command);

    // For commands that need URL and token, prompt for them interactively
    if (["introspect", "diff", "deploy"].includes(commandName)) {
      const interactiveArgs = await promptForMissingArgs({ config: tsConfigPath });

      // Parse with the command name and interactive arguments
      await program.parseAsync(
        [
          commandName,
          "--url",
          interactiveArgs.url,
          "--token",
          interactiveArgs.token,
          "--config",
          tsConfigPath,
        ],
        { from: "user" }
      );

      // Add post-success messaging for first-time introspect from start command
      if (commandName === "introspect" && isFirstTime) {
        await showPostIntrospectGuidance(tsConfigPath);
      }
    } else {
      // Parse with the command name to simulate running it directly
      await program.parseAsync([commandName], { from: "user" });
    }
  }
}

async function showPostIntrospectGuidance(configPath: string): Promise<void> {
  cliConsole.info("");
  cliConsole.separator("─", 60);
  cliConsole.header("🎉 Congratulations! You're all set up!\n");

  cliConsole.info("Your store configuration is now saved locally. Here's what you can do next:\n");

  cliConsole.subtitle("✏️  Edit your configuration:");
  cliConsole.info(`   • Open ${cliConsole.path(configPath)} in your favorite editor`);
  cliConsole.info("   • Modify product types, channels, categories, etc.");
  cliConsole.info("   • Add new configurations or change existing ones\n");

  cliConsole.subtitle("🚀 Apply changes to your store:");
  cliConsole.info(`   • Run ${cliConsole.code("configurator deploy")} to push changes to Saleor`);
  cliConsole.info(
    `   • Use ${cliConsole.code("configurator diff")} to preview what would change first\n`
  );

  cliConsole.subtitle("🧪 Validate locally:");
  cliConsole.info(`   • ${cliConsole.code("configurator build --watch")} for instant feedback`);
  cliConsole.info(`   • ${cliConsole.code("configurator preview")} to mirror deploy diffs\n`);

  cliConsole.subtitle("🔧 Other useful commands:");
  cliConsole.info(
    `   • ${cliConsole.code("configurator introspect")} - Download fresh config from your store`
  );
  cliConsole.info(
    `   • ${cliConsole.code("configurator convert")} - Turn existing YAML into TypeScript`
  );
  cliConsole.info(`   • ${cliConsole.code("configurator --help")} - See all available options\n`);

  cliConsole.subtitle("📖 Learn more:");
  cliConsole.info(
    "   • Read the TypeScript quickstart: docs/typescript-quickstart.md\n"
  );

  cliConsole.muted(
    "💡 Pro tip: Keep your config.yml in version control to track changes over time!"
  );
  cliConsole.separator("─", 60);
}

async function runInteractiveSetup(configPath: string): Promise<void> {
  if (isFirstTimeUser(configPath)) {
    await runFirstTimeSetup(configPath);
  } else {
    await runReturningUserSetup(configPath);
  }
}

export async function startHandler(args: StartCommandArgs): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  await runInteractiveSetup(args.config);
}

export const startCommandConfig: CommandConfig<typeof startCommandSchema> = {
  name: "start",
  description: "🔧 Interactive setup wizard for first-time users",
  schema: startCommandSchema,
  handler: startHandler,
  requiresInteractive: false,
  examples: ["configurator start", "configurator start --quiet"],
};
