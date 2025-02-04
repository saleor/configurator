import { graphqlClient } from "../lib/graphql/client";
import { SaleorConfigurator } from "../core/configurator";
import { ServiceComposer } from "../core/service-container";

const services = ServiceComposer.compose(graphqlClient);
const configurator = new SaleorConfigurator(services);

export { configurator };
