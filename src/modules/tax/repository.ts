import type { Client } from "@urql/core";
import { graphql } from "../../lib/graphql/index";
import { GraphQLError } from "../../lib/errors/graphql";
import type { CountryCode } from "../config/schema/schema";

const getAllTaxClassesDocument = graphql(`
  query GetAllTaxClasses {
    taxClasses(first: 100) {
      edges {
        node {
          id
          name
          countries {
            country {
              code
            }
            rate
            taxClass {
              id
              name
            }
          }
        }
      }
    }
  }
`);

const createTaxClassDocument = graphql(`
  mutation CreateTaxClass($input: TaxClassCreateInput!) {
    taxClassCreate(input: $input) {
      errors {
        field
        message
        code
      }
      taxClass {
        id
        name
        countries {
          country {
            code
          }
          rate
        }
      }
    }
  }
`);

const updateTaxClassDocument = graphql(`
  mutation UpdateTaxClass($id: ID!, $input: TaxClassUpdateInput!) {
    taxClassUpdate(id: $id, input: $input) {
      errors {
        field
        message
        code
      }
      taxClass {
        id
        name
        countries {
          country {
            code
          }
          rate
        }
      }
    }
  }
`);

const deleteTaxClassDocument = graphql(`
  mutation DeleteTaxClass($id: ID!) {
    taxClassDelete(id: $id) {
      errors {
        field
        message
        code
      }
      taxClass {
        id
        name
      }
    }
  }
`);

const getAllTaxConfigurationsDocument = graphql(`
  query GetAllTaxConfigurations {
    taxConfigurations(first: 100) {
      edges {
        node {
          id
          channel {
            id
            slug
            name
          }
          chargeTaxes
          displayGrossPrices
          pricesEnteredWithTax
          taxCalculationStrategy
          taxAppId
        }
      }
    }
  }
`);

const updateTaxConfigurationDocument = graphql(`
  mutation UpdateTaxConfiguration($id: ID!, $input: TaxConfigurationUpdateInput!) {
    taxConfigurationUpdate(id: $id, input: $input) {
      errors {
        field
        message
        code
      }
      taxConfiguration {
        id
        channel {
          id
          slug
          name
        }
        chargeTaxes
        displayGrossPrices
        pricesEnteredWithTax
        taxCalculationStrategy
        taxAppId
      }
    }
  }
`);

const _getTaxCountryConfigurationDocument = graphql(`
  query GetTaxCountryConfiguration($countryCode: CountryCode!) {
    taxCountryConfiguration(countryCode: $countryCode) {
      country {
        code
        country
      }
      taxClassCountryRates {
        rate
        taxClass {
          id
          name
        }
      }
    }
  }
`);

const updateTaxCountryConfigurationDocument = graphql(`
  mutation UpdateTaxCountryConfiguration($countryCode: CountryCode!, $updateTaxClassRates: [TaxClassRateInput!]!) {
    taxCountryConfigurationUpdate(countryCode: $countryCode, updateTaxClassRates: $updateTaxClassRates) {
      errors {
        field
        message
        code
      }
      taxCountryConfiguration {
        country {
          code
          country
        }
        taxClassCountryRates {
          rate
          taxClass {
            id
            name
          }
        }
      }
    }
  }
`);

export interface TaxClassCountryRate {
  countryCode: CountryCode;
  rate: number;
}

export interface TaxClass {
  id: string;
  name: string;
  countryRates: TaxClassCountryRate[];
}

export interface TaxConfiguration {
  id: string;
  channelId: string;
  channelSlug: string;
  channelName: string;
  chargeTaxes: boolean;
  displayGrossPrices: boolean;
  pricesEnteredWithTax: boolean;
  taxCalculationStrategy?: "FLAT_RATES" | "TAX_APP" | null;
  taxAppId?: string | null;
}

export interface CreateTaxClassInput {
  name: string;
  createCountryRates?: Array<{
    countryCode: CountryCode;
    rate: number;
  }>;
}

export interface UpdateTaxClassInput {
  name?: string;
  updateCountryRates?: Array<{
    countryCode: CountryCode;
    rate?: number | null;
  }>;
  removeCountryRates?: CountryCode[];
}

export interface UpdateTaxConfigurationInput {
  chargeTaxes?: boolean;
  taxCalculationStrategy?: "FLAT_RATES" | "TAX_APP";
  displayGrossPrices?: boolean;
  pricesEnteredWithTax?: boolean;
  taxAppId?: string;
}

export class TaxRepository {
  constructor(private client: Client) {}

  async getAllTaxClasses(): Promise<TaxClass[]> {
    const result = await this.client.query(getAllTaxClassesDocument, {});
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to fetch tax classes", result.error);
    }

    return (
      result.data?.taxClasses?.edges?.map((edge) => ({
        id: edge.node.id,
        name: edge.node.name,
        countryRates: edge.node.countries
          .filter((country) => country.taxClass?.id === edge.node.id)
          .map((country) => ({
            countryCode: country.country.code as CountryCode,
            rate: country.rate,
          })),
      })) || []
    );
  }

  async createTaxClass(input: CreateTaxClassInput): Promise<TaxClass> {
    const result = await this.client.mutation(createTaxClassDocument, { input });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to create tax class", result.error);
    }

    if (result.data?.taxClassCreate?.errors?.length) {
      const error = result.data.taxClassCreate.errors[0];
      throw new Error(`Failed to create tax class: ${error.message}`);
    }

    const taxClass = result.data?.taxClassCreate?.taxClass;
    if (!taxClass) {
      throw new Error("Failed to create tax class: No data returned");
    }

    return {
      id: taxClass.id,
      name: taxClass.name,
      countryRates: taxClass.countries?.map((country) => ({
        countryCode: country.country.code as CountryCode,
        rate: country.rate,
      })) || [],
    };
  }

  async updateTaxClass(id: string, input: UpdateTaxClassInput): Promise<TaxClass> {
    const result = await this.client.mutation(updateTaxClassDocument, { id, input });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to update tax class", result.error);
    }

    if (result.data?.taxClassUpdate?.errors?.length) {
      const error = result.data.taxClassUpdate.errors[0];
      throw new Error(`Failed to update tax class: ${error.message}`);
    }

    const taxClass = result.data?.taxClassUpdate?.taxClass;
    if (!taxClass) {
      throw new Error("Failed to update tax class: No data returned");
    }

    return {
      id: taxClass.id,
      name: taxClass.name,
      countryRates: taxClass.countries?.map((country) => ({
        countryCode: country.country.code as CountryCode,
        rate: country.rate,
      })) || [],
    };
  }

  async deleteTaxClass(id: string): Promise<void> {
    const result = await this.client.mutation(deleteTaxClassDocument, { id });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to delete tax class", result.error);
    }

    if (result.data?.taxClassDelete?.errors?.length) {
      const error = result.data.taxClassDelete.errors[0];
      throw new Error(`Failed to delete tax class: ${error.message}`);
    }
  }

  async getAllTaxConfigurations(): Promise<TaxConfiguration[]> {
    const result = await this.client.query(getAllTaxConfigurationsDocument, {});
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to fetch tax configurations", result.error);
    }

    return (
      result.data?.taxConfigurations?.edges?.map((edge) => ({
        id: edge.node.id,
        channelId: edge.node.channel.id,
        channelSlug: edge.node.channel.slug,
        channelName: edge.node.channel.name,
        chargeTaxes: edge.node.chargeTaxes,
        displayGrossPrices: edge.node.displayGrossPrices,
        pricesEnteredWithTax: edge.node.pricesEnteredWithTax,
        taxCalculationStrategy: edge.node.taxCalculationStrategy,
        taxAppId: edge.node.taxAppId,
      })) || []
    );
  }

  async updateTaxConfiguration(id: string, input: UpdateTaxConfigurationInput): Promise<TaxConfiguration> {
    const result = await this.client.mutation(updateTaxConfigurationDocument, { id, input });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to update tax configuration", result.error);
    }

    if (result.data?.taxConfigurationUpdate?.errors?.length) {
      const error = result.data.taxConfigurationUpdate.errors[0];
      throw new Error(`Failed to update tax configuration: ${error.message}`);
    }

    const config = result.data?.taxConfigurationUpdate?.taxConfiguration;
    if (!config) {
      throw new Error("Failed to update tax configuration: No data returned");
    }

    return {
      id: config.id,
      channelId: config.channel.id,
      channelSlug: config.channel.slug,
      channelName: config.channel.name,
      chargeTaxes: config.chargeTaxes,
      displayGrossPrices: config.displayGrossPrices,
      pricesEnteredWithTax: config.pricesEnteredWithTax,
      taxCalculationStrategy: config.taxCalculationStrategy,
      taxAppId: config.taxAppId,
    };
  }

  async updateTaxCountryConfiguration(
    countryCode: CountryCode, 
    updateTaxClassRates: Array<{ taxClassId?: string; rate?: number }>
  ): Promise<void> {
    const result = await this.client.mutation(updateTaxCountryConfigurationDocument, {
      countryCode,
      updateTaxClassRates,
    });
    
    if (result.error) {
      throw GraphQLError.fromCombinedError("Failed to update tax country configuration", result.error);
    }

    if (result.data?.taxCountryConfigurationUpdate?.errors?.length) {
      const error = result.data.taxCountryConfigurationUpdate.errors[0];
      throw new Error(`Failed to update tax country configuration: ${error.message}`);
    }
  }
}