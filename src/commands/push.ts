import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { PushCommand } from "./registry";

try {
  const args = PushCommand.parseArgs(process.argv.slice(2));

  cliConsole.setOptions({ quiet: args.quiet });

  const configurator = createConfigurator(args);
  cliConsole.header("🚀 Saleor Configuration Push\n");

  await configurator.push();

  cliConsole.success("✅ Configuration pushed to Saleor instance");
} catch (error) {
  cliConsole.error(error);
  process.exit(1);
}
