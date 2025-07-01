// This class is a CLI wrapper around a SaleorConfigurator method

import type { SaleorConfigurator } from "../../core/configurator";
import type { ConsoleOutput } from "../console";

export class CommandHandler {
  constructor(
    protected readonly configurator: SaleorConfigurator,
    protected readonly cliConsole: ConsoleOutput
  ) {}

  async execute() {
    throw new Error("Not implemented");
  }
}
