import { z } from "zod";

import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { baseCommandArgsSchema, isHelp } from "../cli/command";
import { PushCommand } from "./registry";

export const pushCommandSchema = baseCommandArgsSchema.and(z.object({}));

type PushCommandArgs = z.infer<typeof pushCommandSchema>;

export async function pushHandler(args: PushCommandArgs) {
  if (isHelp(args)) {
    cliConsole.info(PushCommand.help());
    process.exit(0);
  }

  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);
  cliConsole.header("🚀 Saleor Configuration Push\n");
  await configurator.push();
  cliConsole.success("✅ Configuration pushed to Saleor instance");
}
