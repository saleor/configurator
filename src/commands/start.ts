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
    name: "📥 Pull configuration from Saleor (`introspect`)",
    value: "introspect",
  },
  { name: "📤 Deploy configuration to Saleor (`push`)", value: "push" },
  {
    name: "🔍 Compare local and remote configurations (`diff`)",
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
    const command = createCommand(targetCommand as unknown as Parameters<typeof createCommand>[0]);
    program.addCommand(command);

    // Parse with the command name to simulate running it directly
    await program.parseAsync([selectedAction], { from: "user" });
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
