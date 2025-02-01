import type { Client } from "@urql/core";
import invariant from "tiny-invariant";
import type { CountryCode } from "../bootstraper/bootstrap-client";
import { RetrieverClient, type RawSaleorConfig } from "./retriever-client";
import { YamlConfigurationManager } from "../yaml-configuration-manager";
import type { AttributeInput, SaleorConfig } from "../config-schema";
import { object } from "../utils/object";

function mapChannels(
  rawChannels: RawSaleorConfig["channels"]
): SaleorConfig["channels"] {
  return (
    rawChannels?.map((channel) => ({
      name: channel.name,
      currencyCode: channel.currencyCode,
      defaultCountry: channel.defaultCountry.code as CountryCode,
      slug: channel.slug,
      settings: {
        useLegacyErrorFlow: channel.checkoutSettings.useLegacyErrorFlow,
        automaticallyCompleteFullyPaidCheckouts:
          channel.checkoutSettings.automaticallyCompleteFullyPaidCheckouts,
        defaultTransactionFlowStrategy:
          channel.paymentSettings.defaultTransactionFlowStrategy,
        allocationStrategy: channel.stockSettings.allocationStrategy,
        automaticallyConfirmAllNewOrders:
          channel.orderSettings.automaticallyConfirmAllNewOrders,
        automaticallyFulfillNonShippableGiftCard:
          channel.orderSettings.automaticallyFulfillNonShippableGiftCard,
        expireOrdersAfter: Number(channel.orderSettings.expireOrdersAfter),
        deleteExpiredOrdersAfter: Number(
          channel.orderSettings.deleteExpiredOrdersAfter
        ),
        markAsPaidStrategy: channel.orderSettings.markAsPaidStrategy,
        allowUnpaidOrders: channel.orderSettings.allowUnpaidOrders,
        includeDraftOrderInVoucherUsage:
          channel.orderSettings.includeDraftOrderInVoucherUsage,
      },
    })) ?? []
  );
}

type RawAttribute = NonNullable<
  NonNullable<
    RawSaleorConfig["productTypes"]
  >["edges"][number]["node"]["productAttributes"]
>[number];

function mapAttributes(rawAttributes: RawAttribute[]) {
  return rawAttributes?.map((attribute) => {
    invariant(attribute.name, "Unable to retrieve product type attribute name");
    invariant(
      attribute.inputType,
      "Unable to retrieve product type attribute input type"
    );

    const baseAttribute = {
      name: attribute.name,
      inputType: attribute.inputType,
      type: "PRODUCT_TYPE",
    };

    switch (attribute.inputType) {
      case "DROPDOWN":
      case "MULTISELECT":
      case "SWATCH":
        invariant(
          attribute.choices?.edges,
          "Unable to retrieve attribute choices"
        );
        return {
          ...baseAttribute,
          values: attribute.choices.edges.map((edge) => ({
            name: edge.node.name,
          })),
        } as AttributeInput;
      default:
        return {
          ...baseAttribute,
        } as AttributeInput;
    }
  });
}

function mapProductTypes(rawProductTypes: RawSaleorConfig["productTypes"]) {
  return (
    rawProductTypes?.edges?.map((edge) => ({
      name: edge.node.name,
      attributes: mapAttributes(edge.node.productAttributes ?? []),
    })) ?? []
  );
}

function mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
  return (
    rawPageTypes?.edges?.map((edge) => ({
      name: edge.node.name,
      attributes: mapAttributes(edge.node.attributes ?? []),
    })) ?? []
  );
}

function mapShopSettings(rawConfig: RawSaleorConfig): SaleorConfig["shop"] {
  const settings = rawConfig.shop;
  if (!settings) return undefined;

  return object.filterUndefinedValues({
    defaultMailSenderName: settings.defaultMailSenderName,
    defaultMailSenderAddress: settings.defaultMailSenderAddress,
    displayGrossPrices: settings.displayGrossPrices,
    enableAccountConfirmationByEmail: settings.enableAccountConfirmationByEmail,
    limitQuantityPerCheckout: settings.limitQuantityPerCheckout,
    trackInventoryByDefault: settings.trackInventoryByDefault,
    reserveStockDurationAnonymousUser:
      settings.reserveStockDurationAnonymousUser,
    reserveStockDurationAuthenticatedUser:
      settings.reserveStockDurationAuthenticatedUser,
    defaultDigitalMaxDownloads: settings.defaultDigitalMaxDownloads,
    defaultDigitalUrlValidDays: settings.defaultDigitalUrlValidDays,
    defaultWeightUnit: settings.defaultWeightUnit,
    allowLoginWithoutConfirmation: settings.allowLoginWithoutConfirmation,
    companyAddress: settings.companyAddress
      ? object.filterUndefinedValues({
          streetAddress1: settings.companyAddress.streetAddress1,
          streetAddress2: settings.companyAddress.streetAddress2,
        })
      : undefined,
  });
}

export class ConfigurationRetriever {
  constructor(private client: Client) {}

  private mapConfig(rawConfig: RawSaleorConfig): SaleorConfig {
    const rawAttributes = rawConfig.attributes?.edges ?? [];
    return {
      shop: mapShopSettings(rawConfig),
      channels: mapChannels(rawConfig.channels),
      productTypes: mapProductTypes(rawConfig.productTypes),
      pageTypes: mapPageTypes(rawConfig.pageTypes),
      attributes: mapAttributes(rawAttributes.map((edge) => edge.node)),
    };
  }

  //   fetches all the necessary data from the Saleor API and returns a SaleorConfig object
  async retrieve(): Promise<SaleorConfig> {
    const client = new RetrieverClient(this.client);
    const rawConfig = await client.fetchConfig();
    const config = this.mapConfig(rawConfig);

    const yamlManager = new YamlConfigurationManager();
    yamlManager.save(config);

    return config;
  }
}
