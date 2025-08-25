import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import type { ShopInput } from "../config/schema/schema";
import { ShopError, ShopSettingsUpdateError } from "./errors";
import type { ShopOperations } from "./repository";

export class ShopService {
  constructor(private repository: ShopOperations) {}

  async updateSettings(input: ShopInput) {
    return ServiceErrorWrapper.wrapServiceCall(
      "update shop settings",
      "shop",
      undefined,
      async () => {
        // Handle union type - if it's an empty create input, skip update
        if (Object.keys(input).length === 0) {
          logger.debug("No shop settings to update");
          return null; // No settings to update for create case
        }

        logger.debug("Updating shop settings", { 
          hasName: 'name' in input,
          hasEmail: 'email' in input,
          hasCheckoutSettings: 'checkoutSettings' in input 
        });
        
        // TODO: check diff between current and new settings to avoid unnecessary updates
        const result = await this.repository.updateShopSettings(input);
        
        logger.debug("Successfully updated shop settings");
        return result;
      },
      ShopSettingsUpdateError
    );
  }
}
