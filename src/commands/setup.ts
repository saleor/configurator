import { graphqlClient } from "../graphql/client";
import { SaleorConfigurator } from "../lib/configurator";

const configurator = new SaleorConfigurator(graphqlClient);

export { configurator };
