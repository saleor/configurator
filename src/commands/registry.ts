import { CliCommand } from "../cli/command";
import { pushCommandSchema, pushHandler } from "./push.handler";
import { diffCommandSchema, diffHandler } from "./diff.handler";
import {
  introspectCommandSchema,
  introspectHandler,
} from "./introspect.handler";

export const PushCommand = new CliCommand({
  name: "push",
  description:
    "Updates the remote Saleor instance according to the local configuration.",
  schema: pushCommandSchema,
  handler: pushHandler,
  examples: [
    "saleor-configurator push --url https://my-shop.saleor.cloud --token my-token",
    "saleor-configurator push --url https://my-shop.saleor.cloud --token my-token --config my-config.yml",
    "saleor-configurator push --url https://my-shop.saleor.cloud --token my-token --quiet"
  ]
});

export const DiffCommand = new CliCommand({
  name: "diff",
  description:
    "Shows the differences between the local and remote Saleor instances.",
  schema: diffCommandSchema,
  handler: diffHandler,
  examples: [
    "saleor-configurator diff --url https://my-shop.saleor.cloud --token my-token",
    "saleor-configurator diff --url https://my-shop.saleor.cloud --token my-token --config my-config.yml",
    "saleor-configurator diff --url https://my-shop.saleor.cloud --token my-token --quiet"
  ]
});

export const IntrospectCommand = new CliCommand({
  name: "introspect",
  description: "Shows the current state of the remote Saleor instance.",
  schema: introspectCommandSchema,
  handler: introspectHandler,
  examples: [
    "saleor-configurator introspect --url https://my-shop.saleor.cloud --token my-token",
    "saleor-configurator introspect --url https://my-shop.saleor.cloud --token my-token --config my-config.yml",
    "saleor-configurator introspect --url https://my-shop.saleor.cloud --token my-token --quiet"
  ]
});
