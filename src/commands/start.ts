import { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { selectOption } from "../cli/command";
import { cliConsole } from "../cli/console";

export const startCommandSchema = z.object({
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type StartCommandArgs = z.infer<typeof startCommandSchema>;

const INTERACTIVE_CHOICES = [
  {
    name: "⬇️  Download your store's current configuration to a local file (`introspect`)",
    value: "introspect",
  },
  {
    name: "🚀 Apply changes from your local file to your Saleor store (`deploy`)",
    value: "deploy",
  },
  {
    name: "🔍 See differences between your local file and your live Saleor store (`diff`)",
    value: "diff",
  },
];

async function runInteractiveSetup(): Promise<void> {
  cliConsole.header("🔧 Welcome to Saleor Configurator Setup!\n");

  const selectedAction = await selectOption("What would you like to do?", INTERACTIVE_CHOICES);

  cliConsole.info(`\n✨ Starting ${selectedAction} in interactive mode...\n`);

  // Import the commands dynamically to avoid circular dependencies
  const { commands } = await import("./index");
  const targetCommand = commands.find((cmd) => cmd.name === selectedAction);

  if (targetCommand) {
    // Create a minimal CLI program for the selected command
    const { Command } = await import("@commander-js/extra-typings");
    const { createCommand } = await import("../cli/command");

    const program = new Command();
    const command = createCommand(targetCommand as CommandConfig<typeof targetCommand.schema>);
    program.addCommand(command);

    // For commands that need URL and token, prompt for them interactively
    if (["introspect", "diff", "deploy"].includes(selectedAction)) {
      const { promptForMissingArgs } = await import("../cli/command");
      const interactiveArgs = await promptForMissingArgs({});

      // Parse with the command name and interactive arguments
      await program.parseAsync(
        [
          selectedAction,
          "--url",
          interactiveArgs.url,
          "--token",
          interactiveArgs.token,
          "--config",
          interactiveArgs.config,
        ],
        { from: "user" }
      );
    } else {
      // Parse with the command name to simulate running it directly
      await program.parseAsync([selectedAction], { from: "user" });
    }
  }
}

export async function startHandler(args: StartCommandArgs): Promise<void> {
  cliConsole.setOptions({ quiet: args.quiet });
  await runInteractiveSetup();
}

export const startCommandConfig: CommandConfig<typeof startCommandSchema> = {
  name: "start",
  description: "🔧 Interactive setup wizard for first-time users",
  schema: startCommandSchema,
  handler: startHandler,
  requiresInteractive: false,
  examples: ["configurator start", "configurator start --quiet"],
};
