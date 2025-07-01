import z from "zod";
import { CliCommand } from "../cli/command";

const baseCommandSchema = z.object({
  url: z.string({ required_error: "URL is required" }),
  token: z.string({ required_error: "Token is required" }),
  config: z.string().default("config.yml"),
  quiet: z.boolean().default(false),
});

export type BaseCommandArgs = z.infer<typeof baseCommandSchema>;

export const PushCommand = new CliCommand({
  // TODO: start using name and description
  name: "push",
  description: "Use to push the configuration to the Saleor instance",
  schema: baseCommandSchema,
});

export const DiffCommand = new CliCommand({
  name: "diff",
  description: "Use to diff the configuration to the Saleor instance",
  schema: baseCommandSchema,
});

export const IntrospectCommand = new CliCommand({
  name: "introspect",
  description: "Use to introspect the Saleor instance",
  schema: baseCommandSchema,
});
