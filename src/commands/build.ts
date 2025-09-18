import { writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { Console } from "../cli/console";
import { logger } from "../lib/logger";
import { ensureTsConfigPath } from "../modules/config/utils";
import { TypeScriptConfigurationManager } from "../modules/config/ts-manager";
import chokidar from "chokidar";

const buildCommandSchema = z.object({
  config: z.string().default("config.ts").describe("Path to the TypeScript configuration file"),
  out: z.string().optional().describe("Optional destination file for the generated JSON output"),
  pretty: z
    .boolean()
    .default(false)
    .describe("Pretty-print JSON output (applies to stdout and --out)"),
  quiet: z.boolean().default(false).describe("Suppress stdout output"),
  watch: z.boolean().default(false).describe("Rebuild on file changes"),
});

export type BuildCommandArgs = z.infer<typeof buildCommandSchema>;

export class BuildCommandHandler implements CommandHandler<BuildCommandArgs, void> {
  console = new Console();

  private async runBuild(args: BuildCommandArgs): Promise<string> {
    const manager = new TypeScriptConfigurationManager(args.config);
    const config = await manager.load();
    const spacing = args.pretty ? 2 : undefined;
    const serialized = JSON.stringify(config, null, spacing);

    if (args.out) {
      await writeFile(args.out, `${serialized}\n`, "utf-8");
      this.console.success(`📄 Configuration written to ${args.out}`);
    }

    if (!args.quiet) {
      this.console.info(serialized);
    }

    this.console.success("✅ Configuration build completed");
    return serialized;
  }

  private setupWatcher(args: BuildCommandArgs): void {
    const directory = path.dirname(args.config);
    const watcher = chokidar.watch([args.config, path.join(directory, "**/*.ts")], {
      ignoreInitial: true,
    });

    watcher.on("ready", () => {
      this.console.status("👀 Watching for changes...");
    });

    watcher.on("all", async () => {
      this.console.status("♻️  Change detected. Rebuilding...");
      try {
        await this.runBuild(args);
      } catch (error) {
        logger.error("Rebuild failed", { error });
      }
    });
  }

  async execute(rawArgs: BuildCommandArgs): Promise<void> {
    const args = {
      ...rawArgs,
      config: ensureTsConfigPath(rawArgs.config),
    } satisfies BuildCommandArgs;

    this.console.setOptions({ quiet: args.quiet });

    this.console.status(`🔧 Building configuration from ${args.config}`);

    try {
      await this.runBuild(args);
    } catch (error) {
      logger.error("Failed to build configuration", { error });
      throw error;
    }

    if (args.watch) {
      this.setupWatcher(args);
    }
  }
}

export const buildCommandConfig: CommandConfig<typeof buildCommandSchema> = {
  name: "build",
  description: "Compile a TypeScript configuration program and output the validated JSON",
  schema: buildCommandSchema,
  handler: async (args) => {
    const handler = new BuildCommandHandler();
    await handler.execute(args);
  },
  examples: [
    "configurator build --config config.ts",
    "configurator build --config config.ts --out build/config.json --pretty",
  ],
  requiresInteractive: false,
};
