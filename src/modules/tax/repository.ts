import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_TAX_CONFIGURATIONS = gql`
  query GetTaxConfigurations($first: Int!) {
    taxConfigurations(first: $first) {
      edges {
        node {
          id
          chargeTaxes
          displayGrossPrices
          pricesEnteredWithTax
          channel {
            id
            slug
          }
          taxClasses {
            id
            name
            countries {
              country {
                code
                country
              }
              rate
            }
          }
        }
      }
    }
  }
`;

const GET_TAX_CLASSES = gql`
  query GetTaxClasses($first: Int!) {
    taxClasses(first: $first) {
      edges {
        node {
          id
          name
          countries {
            country {
              code
              country
            }
            rate
          }
        }
      }
    }
  }
`;

const CREATE_TAX_CLASS = gql`
  mutation CreateTaxClass($input: TaxClassCreateInput!) {
    taxClassCreate(input: $input) {
      taxClass {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_TAX_CLASS = gql`
  mutation UpdateTaxClass($id: ID!, $input: TaxClassUpdateInput!) {
    taxClassUpdate(id: $id, input: $input) {
      taxClass {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const TAX_CONFIGURATION_UPDATE = gql`
  mutation TaxConfigurationUpdate($id: ID!, $input: TaxConfigurationUpdateInput!) {
    taxConfigurationUpdate(id: $id, input: $input) {
      taxConfiguration {
        id
        chargeTaxes
        displayGrossPrices
        pricesEnteredWithTax
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const TAX_CLASS_COUNTRY_RATE_UPDATE = gql`
  mutation TaxClassCountryRateUpdate($taxClassId: ID!, $countryRates: [CountryRateUpdateInput!]!) {
    taxClassUpdate(id: $taxClassId, input: { updateCountriesRates: $countryRates }) {
      taxClass {
        id
        countries {
          country {
            code
          }
          rate
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const TAX_CONFIGURATION_PER_COUNTRY_UPDATE = gql`
  mutation TaxConfigurationPerCountryUpdate($taxConfigurationId: ID!, $countryExceptions: [TaxConfigurationPerCountryInput!]!) {
    taxConfigurationUpdate(id: $taxConfigurationId, input: { updateCountriesConfiguration: $countryExceptions }) {
      taxConfiguration {
        id
        countries {
          country {
            code
          }
          chargeTaxes
          displayGrossPrices
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

interface TaxClass {
  id: string;
  name: string;
  countries: Array<{
    country: { code: string; country: string };
    rate: number;
  }>;
}

interface TaxConfiguration {
  id: string;
  chargeTaxes: boolean;
  displayGrossPrices: boolean;
  pricesEnteredWithTax: boolean;
  channel: { id: string; slug: string };
  taxClasses?: TaxClass[];
}

export class TaxRepository {
  constructor(private readonly client: Client) {}

  async getTaxConfigurations(): Promise<TaxConfiguration[]> {
    const result = await this.client
      .query(GET_TAX_CONFIGURATIONS, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch tax configurations: ${result.error.message}`);
    }
    
    return result.data?.taxConfigurations.edges.map((edge: any) => edge.node) || [];
  }

  async getTaxClasses(): Promise<TaxClass[]> {
    const result = await this.client
      .query(GET_TAX_CLASSES, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch tax classes: ${result.error.message}`);
    }
    
    return result.data?.taxClasses.edges.map((edge: any) => edge.node) || [];
  }

  async createTaxClass(input: { name: string }): Promise<TaxClass> {
    const result = await this.client
      .mutation(CREATE_TAX_CLASS, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create tax class: ${result.error.message}`);
    }
    
    const { taxClass, errors } = result.data?.taxClassCreate || {};
    if (errors?.length) {
      throw new Error(
        `Tax class creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return taxClass;
  }

  async updateTaxClass(id: string, input: { name: string }): Promise<TaxClass> {
    const result = await this.client
      .mutation(UPDATE_TAX_CLASS, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update tax class: ${result.error.message}`);
    }
    
    const { taxClass, errors } = result.data?.taxClassUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Tax class update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return taxClass;
  }

  async updateTaxConfiguration(id: string, input: any): Promise<TaxConfiguration> {
    const result = await this.client
      .mutation(TAX_CONFIGURATION_UPDATE, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update tax configuration: ${result.error.message}`);
    }
    
    const { taxConfiguration, errors } = result.data?.taxConfigurationUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Tax configuration update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return taxConfiguration;
  }

  async updateTaxClassCountryRates(
    taxClassId: string, 
    countryRates: Array<{ countryCode: string; rate: number }>
  ): Promise<TaxClass> {
    const result = await this.client
      .mutation(TAX_CLASS_COUNTRY_RATE_UPDATE, { taxClassId, countryRates })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update tax class rates: ${result.error.message}`);
    }
    
    const { taxClass, errors } = result.data?.taxClassUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Tax class rate update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return taxClass;
  }

  async updateTaxConfigurationPerCountry(
    taxConfigurationId: string,
    countryExceptions: Array<{
      countryCode: string;
      chargeTaxes?: boolean;
      displayGrossPrices?: boolean;
    }>
  ): Promise<TaxConfiguration> {
    const result = await this.client
      .mutation(TAX_CONFIGURATION_PER_COUNTRY_UPDATE, { 
        taxConfigurationId, 
        countryExceptions 
      })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update country exceptions: ${result.error.message}`);
    }
    
    const { taxConfiguration, errors } = result.data?.taxConfigurationUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Country exception update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return taxConfiguration;
  }
} 