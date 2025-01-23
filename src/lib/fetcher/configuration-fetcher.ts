import type { Client } from "@urql/core";
import type { CountryCode } from "../bootstraper/bootstrap-client";
import type { SaleorConfig } from "../configurator";
import { FetcherClient, type RawSaleorConfig } from "./fetcher-client";

export class ConfigurationFetcher {
  constructor(private client: Client) {}

  private transformConfig(rawConfig: RawSaleorConfig): SaleorConfig {
    return {
      channels:
        rawConfig.channels?.map((edge) => ({
          name: edge.name,
          currencyCode: edge.currencyCode,
          defaultCountry: edge.defaultCountry.code as CountryCode,
          slug: edge.slug,
        })) ?? [],
      // TODO: Add product types, page types and attributes
    };
  }

  //   fetches all the necessary data from the Saleor API and returns a SaleorConfig object
  async fetch(): Promise<SaleorConfig> {
    const client = new FetcherClient(this.client);
    const rawConfig = await client.fetchConfig();
    return this.transformConfig(rawConfig);
  }
}
