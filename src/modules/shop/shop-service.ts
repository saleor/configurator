import type { ShopOperations } from "./repository";
import type { SaleorConfig } from "../config/schema";

export class ShopService {
  constructor(private repository: ShopOperations) {}

  async updateSettings(input: NonNullable<SaleorConfig["shop"]>) {
    // TODO: check diff between current and new settings to avoid unnecessary updates
    return this.repository.updateShopSettings(input);
  }
}
