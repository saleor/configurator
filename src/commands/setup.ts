import { graphqlClient } from "../lib/graphql/client";
import { SaleorConfigurator } from "../core/configurator";

const configurator = new SaleorConfigurator(graphqlClient);

export { configurator };
