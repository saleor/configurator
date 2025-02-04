import invariant from "tiny-invariant";
import { object } from "../../lib/utils/object";
import {
  type ConfigurationOperations,
  type RawSaleorConfig,
} from "./repository";
import type { AttributeInput, CountryCode, SaleorConfig } from "./schema";
import type { ConfigurationStorage } from "./yaml-manager";

export class ConfigurationService {
  constructor(
    private repository: ConfigurationOperations,
    private storage: ConfigurationStorage
  ) {}

  async retrieve(): Promise<SaleorConfig> {
    const rawConfig = await this.repository.fetchConfig();
    const config = this.mapConfig(rawConfig);
    await this.storage.save(config);
    return config;
  }

  private mapChannels(
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

  private mapAttributes(rawAttributes: RawAttribute[]) {
    return rawAttributes?.map((attribute) => {
      invariant(
        attribute.name,
        "Unable to retrieve product type attribute name"
      );
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

  private mapProductTypes(rawProductTypes: RawSaleorConfig["productTypes"]) {
    return (
      rawProductTypes?.edges?.map((edge) => ({
        name: edge.node.name,
        attributes: this.mapAttributes(edge.node.productAttributes ?? []),
      })) ?? []
    );
  }

  private mapPageTypes(rawPageTypes: RawSaleorConfig["pageTypes"]) {
    return (
      rawPageTypes?.edges?.map((edge) => ({
        name: edge.node.name,
        attributes: this.mapAttributes(edge.node.attributes ?? []),
      })) ?? []
    );
  }

  private mapShopSettings(rawConfig: RawSaleorConfig): SaleorConfig["shop"] {
    const settings = rawConfig.shop;
    if (!settings) return undefined;

    return object.filterUndefinedValues({
      defaultMailSenderName: settings.defaultMailSenderName,
      defaultMailSenderAddress: settings.defaultMailSenderAddress,
      displayGrossPrices: settings.displayGrossPrices,
      enableAccountConfirmationByEmail:
        settings.enableAccountConfirmationByEmail,
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
    });
  }

  mapConfig(rawConfig: RawSaleorConfig): SaleorConfig {
    const rawAttributes = rawConfig.attributes?.edges ?? [];
    return {
      shop: this.mapShopSettings(rawConfig),
      channels: this.mapChannels(rawConfig.channels),
      productTypes: this.mapProductTypes(rawConfig.productTypes),
      pageTypes: this.mapPageTypes(rawConfig.pageTypes),
      attributes: this.mapAttributes(rawAttributes.map((edge) => edge.node)),
    };
  }
}

type RawAttribute = NonNullable<
  NonNullable<
    RawSaleorConfig["productTypes"]
  >["edges"][number]["node"]["productAttributes"]
>[number];
