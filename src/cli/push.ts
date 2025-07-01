import { CommandHandler } from "./lib/handler";

export class SaleorConfiguratorPush extends CommandHandler {
  async execute() {
    this.cliConsole.status("🚀 Saleor Configuration Push\n");

    await this.configurator.push();

    this.cliConsole.status("✅ Configuration pushed to Saleor instance");
  }
}
