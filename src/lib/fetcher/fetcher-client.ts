import type { Client } from "@urql/core";
import { graphql, type ResultOf } from "gql.tada";

const getConfigQuery = graphql(`
  query GetConfig {
    channels {
      id
      name
      currencyCode
      defaultCountry {
        code
      }
      slug
    }
    productTypes {
      edges {
        node {
          id
          name
          productAttributes {
            id
            name
            type
            inputType
          }
        }
      }
    }
    pageTypes {
      edges {
        node {
          id
          name
          attributes {
            id
            name
            type
            inputType
          }
        }
      }
    }
    attributes {
      edges {
        node {
          id
          name
          type
          inputType
        }
      }
    }
  }
`);

export type RawSaleorConfig = ResultOf<typeof getConfigQuery>;

export class FetcherClient {
  constructor(private client: Client) {}

  async fetchConfig() {
    const result = await this.client.query(getConfigQuery, {});

    if (!result.data) {
      throw new Error("Failed to fetch config");
    }

    return result.data;
  }
}
