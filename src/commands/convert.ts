import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { Console } from "../cli/console";
import { ensureTsConfigPath } from "../modules/config/utils";
import { TypeScriptConfigurationManager } from "../modules/config/ts-manager";
import { YamlConfigurationManager } from "../modules/config/yaml-manager";

const convertCommandSchema = z.object({
  from: z.string().default("config.yml").describe("Source YAML configuration"),
  to: z.string().default("config.ts").describe("Target TypeScript configuration"),
  layout: z.enum(["single", "sections"]).default("sections").describe("Output layout for TypeScript files"),
  overwrite: z.boolean().default(false).describe("Allow overwriting existing files"),
});

export type ConvertCommandArgs = z.infer<typeof convertCommandSchema>;

class ConvertCommandHandler implements CommandHandler<ConvertCommandArgs, void> {
  console = new Console();

  async execute(args: ConvertCommandArgs): Promise<void> {
    const targetPath = ensureTsConfigPath(args.to);
    this.console.status("🔄 Converting YAML configuration to TypeScript");

    const yamlManager = new YamlConfigurationManager(args.from);
    const config = await yamlManager.load();

  const layout = args.layout === "sections" ? "split-sections" : "single";
  const baseDir = layout === "split-sections" ? path.join(path.dirname(targetPath), "sections") : undefined;
  const tsManager = new TypeScriptConfigurationManager(targetPath, {
    layout,
    baseDir,
  });

    if (!args.overwrite && existsSync(targetPath)) {
      this.console.error(`Target file ${targetPath} already exists. Use --overwrite to replace it.`);
      return;
    }

    await tsManager.save(config);
    this.console.success("✅ Conversion complete");
  }
}

export const convertCommandConfig: CommandConfig<typeof convertCommandSchema> = {
  name: "convert",
  description: "Convert a YAML configuration file into the TypeScript DSL",
  schema: convertCommandSchema,
  handler: async (args) => {
    const handler = new ConvertCommandHandler();
    await handler.execute(args);
  },
  examples: [
    "configurator convert --from config.yml --to config.ts",
    "configurator convert --from legacy.yml --to config/stack.ts --layout sections",
  ],
  requiresInteractive: false,
};
