import type { BootstrapClient } from "./bootstrap-client";
import type { SaleorConfig } from "../config-schema";

export class ShopBootstraper {
  constructor(private client: BootstrapClient) {}

  async bootstrapShop(config: NonNullable<SaleorConfig["shop"]>) {
    console.log("Bootstrapping shop settings");
    await this.client.updateShopSettings(config);
    console.log("Shop settings updated");
  }
}
