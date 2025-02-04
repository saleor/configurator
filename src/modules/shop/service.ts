import type { ShopOperations } from "./repository";
import type { SaleorConfig } from "../config/schema";

export class ShopService {
  constructor(private repository: ShopOperations) {}

  async updateSettings(config: NonNullable<SaleorConfig["shop"]>) {
    return this.repository.updateShopSettings(config);
  }
}
