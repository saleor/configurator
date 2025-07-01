import { CommandHandler } from "./lib/handler";

export class SaleorConfiguratorIntrospect extends CommandHandler {
  async execute() {
    this.cliConsole.status("🚀 Saleor Configuration Introspect\n");

    await this.configurator.introspect();

    // TODO: bring back interactivity
    this.cliConsole.status("✅ Introspected Saleor instance");
  }
}
