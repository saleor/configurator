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
  .option("config", {
    type: "string",
    description: "Path to configuration file",
    default: "config.yml",
  })
  .parseSync();

const url = argv.url;
const token = argv.token;
const configPath = argv.config;

if (!url) {
  throw new Error("URL is not set");
}

if (!token) {
  throw new Error("Token is not set");
}

// Create a new client with the provided configuration
const client = createClient(token, url);

// Create new services with the client, passing the config path
const services = ServiceComposer.compose(client, configPath);

// Create a new configurator with the services
const configurator = new SaleorConfigurator(services);

configurator.pull();
