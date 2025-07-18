import type { Client } from "@urql/core";
import { graphql, type ResultOf, type VariablesOf } from "gql.tada";
import { GraphQLError } from "../../lib/errors/graphql";
import { logger } from "../../lib/logger";

const createPageTypeMutation = graphql(`
  mutation CreatePageType($input: PageTypeCreateInput!) {
    pageTypeCreate(input: $input) {
      pageType {
        id
        name
        attributes {
          id
          name
        }
      }
    }
  }
`);

type PageTypeCreateInput = VariablesOf<typeof createPageTypeMutation>["input"];

export type PageType = NonNullable<
  NonNullable<
    ResultOf<typeof createPageTypeMutation>["pageTypeCreate"]
  >["pageType"]
>;

const getPageTypeByNameQuery = graphql(`
  query GetPageTypeByName($name: String!) {
    pageTypes(filter: { search: $name }, first: 1) {
      edges {
        node {
          id
          name
          attributes {
            id
            name
          }
        }
      }
    }
  }
`);

const pageAttributeAssignMutation = graphql(`
  mutation PageAttributeAssign($pageTypeId: ID!, $attributeIds: [ID!]!) {
    pageAttributeAssign(pageTypeId: $pageTypeId, attributeIds: $attributeIds) {
      pageType {
        id
      }
      errors {
        message
        code
        field
      }
    }
  }
`);

const getPageTypeQuery = graphql(`
  query GetPageType($id: ID!) {
    pageType(id: $id) {
      id
      name
      attributes {
        id
        name
      }
    }
  }
`);

export interface PageTypeOperations {
  createPageType(pageTypeInput: PageTypeCreateInput): Promise<PageType>;
  getPageTypeByName(name: string): Promise<PageType | null | undefined>;
  getPageType(id: string): Promise<PageType | null | undefined>;
  assignAttributes(
    pageTypeId: string,
    attributeIds: string[]
  ): Promise<{ id: string }>;
}

export class PageTypeRepository implements PageTypeOperations {
  constructor(private client: Client) {}

  async createPageType(pageTypeInput: PageTypeCreateInput) {
    const result = await this.client.mutation(createPageTypeMutation, {
      input: pageTypeInput,
    });

    if (!result.data?.pageTypeCreate?.pageType) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to create page type ${pageTypeInput.name}`
      );
    }

    const pageType = result.data.pageTypeCreate.pageType;

    logger.info("Page type created", { name: pageType.name });

    return pageType;
  }

  async getPageTypeByName(name: string) {
    const result = await this.client.query(getPageTypeByNameQuery, {
      name,
    });

    return result.data?.pageTypes?.edges?.[0]?.node;
  }

  async getPageType(id: string) {
    const result = await this.client.query(getPageTypeQuery, {
      id,
    });

    return result.data?.pageType;
  }

  async assignAttributes(pageTypeId: string, attributeIds: string[]) {
    const result = await this.client.mutation(pageAttributeAssignMutation, {
      pageTypeId,
      attributeIds,
    });

    if (!result.data?.pageAttributeAssign?.pageType) {
      throw GraphQLError.fromGraphQLErrors(
        result.error?.graphQLErrors ?? [],
        `Failed to assign attributes to page type ${pageTypeId}`
      );
    }

    return result.data?.pageAttributeAssign?.pageType;
  }
}
