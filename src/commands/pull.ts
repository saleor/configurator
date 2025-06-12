import { createClient } from "../lib/graphql/client";
import { ServiceComposer } from "../core/service-container";
import { SaleorConfigurator } from "../core/configurator";
import { z } from "zod";
import { parseCliArgs } from "../lib/utils/cli-args";

const argsSchema = z.object({
  url: z.string({ required_error: "URL is required" }),
  token: z.string({ required_error: "Token is required" }),
  config: z.string().default("config.yml"),
});

const { url, token, config: configPath } = parseCliArgs(argsSchema);

// Create a new client with the provided configuration
const client = createClient(token, url);

// Create new services with the client, passing the config path
const services = ServiceComposer.compose(client, configPath);

// Create a new configurator with the services
const configurator = new SaleorConfigurator(services);

configurator.pull();
