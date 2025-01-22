import { SaleorClient } from "../lib/saleor-client";
import { SaleorBuilder } from "../lib/bootstraper";
import { SaleorConfigurator } from "../lib/configurator";
import { graphqlClient } from "../graphql/client";

const saleorClient = new SaleorClient(graphqlClient);
const builder = new SaleorBuilder(saleorClient);
const configurator = new SaleorConfigurator(builder);

export { configurator };
