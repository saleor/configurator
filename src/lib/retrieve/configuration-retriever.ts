import type { Client } from "@urql/core";
import invariant from "tiny-invariant";
import type { CountryCode } from "../bootstraper/bootstrap-client";
import type { AttributeInput, SaleorConfig } from "../configurator";
import { RetrieverClient, type RawSaleorConfig } from "./retriever-client";
import { YamlConfigurationManager } from "./yaml-configuration-manager";

function mapChannels(rawChannels: RawSaleorConfig["channels"]) {
  return (
    rawChannels?.map((channel) => ({
      name: channel.name,
      currencyCode: channel.currencyCode,
      defaultCountry: channel.defaultCountry.code as CountryCode,
      slug: channel.slug,
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

export class ConfigurationRetriever {
  constructor(private client: Client) {}

  private parseConfig(rawConfig: RawSaleorConfig): SaleorConfig {
    const rawAttributes = rawConfig.attributes?.edges ?? [];
    return {
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
    const config = this.parseConfig(rawConfig);

    const yamlManager = new YamlConfigurationManager();
    yamlManager.save(config);

    return config;
  }
}
