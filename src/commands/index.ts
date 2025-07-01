import z from "zod";
import { CliCommand, type CliCommandDefinition } from "./cli-command";

export const commands = {
  push: new CliCommand({
    description: "Used to push the configuration to the Saleor instance",
    schema: z.object({
      url: z.string(),
      token: z.string(),
    }),
  }),
} satisfies Record<string, CliCommand<CliCommandDefinition<z.ZodRawShape>>>;
