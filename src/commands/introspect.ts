import { SaleorConfiguratorIntrospect } from "../cli/introspect";
import { cliConsole } from "../cli/lib/console";
import { SaleorConfigurator } from "../core/configurator";
import { ServiceComposer } from "../core/service-container";
import { createClient } from "../lib/graphql/client";
import { IntrospectCommand } from "./index";

try {
  const {
    url,
    token,
    config: configPath,
    quiet,
  } = IntrospectCommand.parseArgs(process.argv.slice(2));

  cliConsole.setOptions({ quiet });

  // Create a new client with the provided configuration
  const client = createClient(token, url);

  // Create new services with the client, passing the config path
  const services = ServiceComposer.compose(client, configPath);

  // Create a new configurator with the services
  const configurator = new SaleorConfigurator(services);

  const introspectCommand = new SaleorConfiguratorIntrospect(
    configurator,
    cliConsole
  );

  await introspectCommand.execute();
} catch (error) {
  cliConsole.error(error);
  process.exit(1);
}
