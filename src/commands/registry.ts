import { CliCommand } from "../cli/command";
import { pushCommandSchema, pushHandler } from "./push.handler";
import { diffCommandSchema, diffHandler } from "./diff.handler";
import {
  introspectCommandSchema,
  introspectHandler,
} from "./introspect.handler";

export const PushCommand = new CliCommand({
  name: "push",
  description: "Use to push the configuration to the Saleor instance",
  schema: pushCommandSchema,
  handler: pushHandler,
});

export const DiffCommand = new CliCommand({
  name: "diff",
  description: "Use to diff the configuration to the Saleor instance",
  schema: diffCommandSchema,
  handler: diffHandler,
});

export const IntrospectCommand = new CliCommand({
  name: "introspect",
  description: "Use to introspect the Saleor instance",
  schema: introspectCommandSchema,
  handler: introspectHandler,
});
