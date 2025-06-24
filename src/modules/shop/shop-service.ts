import type { ShopOperations } from "./repository";
import type { ShopInput, ShopCreateInput, ShopUpdateInput } from "../config/schema";

export class ShopService {
  constructor(private repository: ShopOperations) {}

  async updateSettings(input: ShopInput) {
    // Handle union type - if it's an empty create input, skip update
    if (Object.keys(input).length === 0) {
      return null; // No settings to update for create case
    }

    // TODO: check diff between current and new settings to avoid unnecessary updates
    return this.repository.updateShopSettings(input as ShopUpdateInput);
  }
}
