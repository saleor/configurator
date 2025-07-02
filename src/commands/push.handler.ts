import { z } from "zod";

export const pushCommandSchema = baseCommandArgsSchema.extend({});

type PushCommandArgs = z.infer<typeof pushCommandSchema>;

import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { baseCommandArgsSchema } from "../cli/command";

export async function pushHandler(args: PushCommandArgs) {
  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);
  cliConsole.header("🚀 Saleor Configuration Push\n");
  await configurator.push();
  cliConsole.success("✅ Configuration pushed to Saleor instance");
}
