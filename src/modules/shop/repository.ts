import type { Client } from "@urql/core";
import { graphql, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
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

export type ShopSettingsInput = VariablesOf<typeof updateShopSettingsMutation>["input"];

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
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        "Failed to update shop settings"
      );
    }

    if (result.data?.shopSettingsUpdate?.errors?.length) {
      throw GraphQLError.fromDataErrors(
        "Failed to update shop settings",
        result.data.shopSettingsUpdate.errors
      );
    }

    logger.info("Shop settings updated");
  }
}
