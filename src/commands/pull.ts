import { createClient } from "../lib/graphql/client";
import { ServiceComposer } from "../core/service-container";
import { SaleorConfigurator } from "../core/configurator";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
  .option("url", {
    type: "string",
    description: "Saleor instance URL",
  })
  .option("token", {
    type: "string",
    description: "Saleor API token",
  })
  .parseSync();

const url = argv.url;
const token = argv.token;

if (!url) {
  throw new Error("URL is not set");
}

if (!token) {
  throw new Error("Token is not set");
}

// Create a new client with the provided configuration
const client = createClient(token, url);

// Create new services with the client
const services = ServiceComposer.compose(client);

// Create a new configurator with the services
const configurator = new SaleorConfigurator(services);

configurator.retrieve();
