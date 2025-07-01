import { logger } from "../lib/logger";
import { cliConsole } from "../cli/lib/console";
import { SaleorConfigurator } from "../core/configurator";
import { ServiceComposer } from "../core/service-container";
import { createClient } from "../lib/graphql/client";
import { DiffCommand } from "./index";

try {
  const {
    url,
    token,
    config: configPath,
    quiet,
  } = DiffCommand.parseArgs(process.argv.slice(2));

  cliConsole.setOptions({ quiet });

  // Create a new client with the provided configuration
  const client = createClient(token, url);

  // Create new services with the client, passing the config path
  const services = ServiceComposer.compose(client, configPath);

  // Create a new configurator with the services
  const configurator = new SaleorConfigurator(services);

  cliConsole.info(
    "⏳ Preparing a diff between the configuration and the Saleor instance..."
  );

  const { summary, output } = await configurator.diff();

  cliConsole.info(output);

  logger.info("Diff process completed successfully", {
    totalChanges: summary.totalChanges,
    creates: summary.creates,
    updates: summary.updates,
    deletes: summary.deletes,
  });

  if (summary.totalChanges > 0) {
    cliConsole.status(
      `\n⚠️  Found ${summary.totalChanges} difference${
        summary.totalChanges !== 1 ? "s" : ""
      } that would be applied by 'push'`
    );
  } else {
    cliConsole.status("\n✅ No differences found - configurations are in sync");
  }
} catch (error) {
  cliConsole.error(error);
  process.exit(1);
}
