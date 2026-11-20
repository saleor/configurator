import type { Client } from "@urql/core";
import { graphql } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import type { MetadataItem } from "./schema";

const updateMetadataMutation = graphql(`
  mutation UpdateMetadata($id: ID!, $input: [MetadataInput!]!) {
    updateMetadata(id: $id, input: $input) {
      errors {
        field
        message
        code
      }
    }
  }
`);

export interface MetadataOperations {
  /** Adds or overwrites the given keys. Keys not listed stay as they are. */
  updateMetadata(id: string, items: readonly MetadataItem[]): Promise<void>;
}

export class MetadataRepository implements MetadataOperations {
  constructor(private readonly client: Client) {}

  async updateMetadata(id: string, items: readonly MetadataItem[]): Promise<void> {
    const result = await this.client.mutation(updateMetadataMutation, { id, input: [...items] });

    if (result.error) {
      throw GraphQLError.fromCombinedError(`Failed to update metadata for ${id}`, result.error);
    }

    const errors = result.data?.updateMetadata?.errors ?? [];
    if (errors.length > 0) {
      throw GraphQLError.fromDataErrors(`Failed to update metadata for ${id}`, errors);
    }
  }
}
