import { SaleorClient } from "../lib/saleor-client";
import { SaleorBootstraper } from "../lib/bootstraper/product-types-bootstraper";
import { SaleorConfigurator } from "../lib/configurator";
import { graphqlClient } from "../graphql/client";

const saleorClient = new SaleorClient(graphqlClient);
const bootstraper = new SaleorBootstraper(saleorClient);
const configurator = new SaleorConfigurator(bootstraper);

export { configurator };
