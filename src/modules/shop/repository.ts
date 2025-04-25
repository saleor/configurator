import type { Client } from "@urql/core";
import { graphql, type VariablesOf } from "gql.tada";
import { logger } from "../../lib/logger";

const updateShopSettingsMutation = graphql(`
  mutation UpdateShopSettings($input: ShopSettingsInput!) {
    shopSettingsUpdate(input: $input) {
      shop {
        headerText
        description
        defaultWeightUnit
        fulfillmentAutoApprove
        fulfillmentAllowUnpaid
        automaticFulfillmentDigitalProducts
      }
      errors {
        field
        message
        code
      }
    }
  }
`);

export type ShopSettingsInput = VariablesOf<
  typeof updateShopSettingsMutation
>["input"];

export interface ShopOperations {
  updateShopSettings(input: ShopSettingsInput): Promise<void>;
}

export class ShopRepository implements ShopOperations {
  constructor(private client: Client) {}

  async updateShopSettings(input: ShopSettingsInput) {
    const result = await this.client.mutation(updateShopSettingsMutation, {
      input,
    });

    if (result.error) {
      throw new Error(
        `Failed to update shop settings: ${result.error.message}`
      );
    }

    if (result.data?.shopSettingsUpdate?.errors?.length) {
      throw new Error(
        `Failed to update shop settings: ${result.data.shopSettingsUpdate.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    logger.info("Shop settings updated");
  }
}
