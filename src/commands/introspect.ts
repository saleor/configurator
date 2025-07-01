import { cliConsole } from "../cli/console";
import { createConfigurator } from "../core/configurator";
import { IntrospectCommand } from "./registry";

try {
  const args = IntrospectCommand.parseArgs(process.argv.slice(2));

  cliConsole.setOptions({ quiet: args.quiet });
  const configurator = createConfigurator(args);

  cliConsole.status("🚀 Saleor Configuration Introspect\n");

  await configurator.introspect();

  // TODO: bring back interactivity
  cliConsole.status("✅ Introspected Saleor instance");
} catch (error) {
  cliConsole.error(error);
  process.exit(1);
}
