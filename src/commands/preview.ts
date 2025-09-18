import type { z } from "zod";
import type { CommandConfig } from "../cli/command";
import { baseCommandArgsSchema } from "../cli/command";
import { Console } from "../cli/console";
import { handleDiff } from "./diff";
import { ensureTsConfigPath } from "../modules/config/utils";
import { COMMAND_NAME } from "../meta";

const previewCommandSchema = baseCommandArgsSchema;

export type PreviewCommandArgs = z.infer<typeof previewCommandSchema>;

export const previewCommandConfig: CommandConfig<typeof previewCommandSchema> = {
  name: "preview",
  description: "Preview changes with a TypeScript-first workflow",
  schema: previewCommandSchema,
  handler: async (args) => {
    const tsArgs = {
      ...args,
      config: ensureTsConfigPath(args.config),
    } satisfies PreviewCommandArgs;

    const console = new Console();
    console.setOptions({ quiet: tsArgs.quiet });
    console.status("🔮 Previewing TypeScript configuration changes (no remote mutations)");

    await handleDiff(tsArgs);
  },
  requiresInteractive: true,
  examples: [
    `${COMMAND_NAME} preview --config config/stack.ts --url https://your-store.saleor.cloud/graphql/ --token token123`,
    `${COMMAND_NAME} preview --config config.ts`,
  ],
};
