import { graphqlClient } from "../graphql/client";
import { SaleorConfigurator } from "../lib/configurator";
import { SaleorClient } from "../lib/saleor-client";

const saleorClient = new SaleorClient(graphqlClient);
const configurator = new SaleorConfigurator(saleorClient);

export { configurator };
