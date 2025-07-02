import { z } from "zod";

export const pushCommandSchema = z.object({
  url: z.string({ required_error: "URL is required" }),
  token: z.string({ required_error: "Token is required" }),
  config: z.string().default("config.yml"),
  quiet: z.boolean().default(false),
});

type PushCommandArgs = z.infer<typeof pushCommandSchema>;

import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";

export async function pushHandler(args: PushCommandArgs) {
  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);
  cliConsole.header("🚀 Saleor Configuration Push\n");
  await configurator.push();
  cliConsole.success("✅ Configuration pushed to Saleor instance");
}
