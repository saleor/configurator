import { graphql, type VariablesOf, type ResultOf } from "gql.tada";
import { type AnyVariables, type Client } from "@urql/core";
import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import { GraphQLError } from "../../lib/errors/graphql";

const GetPages = graphql(`
  query GetPages($first: Int!) {
    pages(first: $first) {
      edges {
        node {
          id
          title
          slug
          content
          isPublished
          publishedAt
          pageType {
            id
            name
            slug
            attributes {
              id
              slug
              name
              type
            }
          }
          attributes {
            attribute {
              id
              slug
              name
              type
            }
            values {
              id
              slug
              name
              value
              boolean
              date
              dateTime
              file {
                url
              }
              reference
              plainText
            }
          }
        }
      }
    }
  }
`);

const GetPageBySlug = graphql(`
  query GetPageBySlug($slug: String!) {
    page(slug: $slug) {
      id
      title
      slug
      content
      isPublished
      publishedAt
      pageType {
        id
        name
        slug
        attributes {
          id
          slug
          name
          type
        }
      }
      attributes {
        attribute {
          id
          slug
          name
          type
        }
        values {
          id
          slug
          name
          value
          boolean
          date
          dateTime
          file {
            url
          }
          reference
          plainText
        }
      }
    }
  }
`);

const CreatePage = graphql(`
  mutation CreatePage($input: PageCreateInput!) {
    pageCreate(input: $input) {
      page {
        id
        title
        slug
        content
        isPublished
        publishedAt
        pageType {
          id
          name
        }
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`);

const UpdatePage = graphql(`
  mutation UpdatePage($id: ID!, $input: PageInput!) {
    pageUpdate(id: $id, input: $input) {
      page {
        id
        title
        slug
        content
        isPublished
        publishedAt
        pageType {
          id
          name
        }
        attributes {
          attribute {
            id
            slug
          }
          values {
            id
            name
            value
          }
        }
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`);

const UpdatePageAttributes = graphql(`
  mutation UpdatePageAttributes($id: ID!, $input: [AttributeValueInput!]!) {
    pageAttributeAssign(id: $id, attributeValues: $input) {
      page {
        id
        attributes {
          attribute {
            id
            slug
          }
          values {
            id
            name
            value
          }
        }
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`);

const UnassignPageAttributes = graphql(`
  mutation UnassignPageAttributes($id: ID!, $attributeIds: [ID!]!) {
    pageAttributeUnassign(id: $id, attributeIds: $attributeIds) {
      page {
        id
        attributes {
          attribute {
            id
            slug
          }
        }
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`);

// Type exports for external use
export type Page = NonNullable<ResultOf<typeof GetPageBySlug>["page"]>;
export type PageCreateInput = VariablesOf<typeof CreatePage>["input"];
export type PageInput = VariablesOf<typeof UpdatePage>["input"];

export interface ModelOperations {
  getPages(): Promise<Page[]>;
  getPageBySlug(slug: string): Promise<Page | null>;
  createPage(input: PageCreateInput): Promise<Page>;
  updatePage(id: string, input: PageInput): Promise<Page>;
  updatePageAttributes(id: string, attributes: AttributeValueInput[]): Promise<void>;
  unassignPageAttributes(id: string, attributeIds: string[]): Promise<void>;
}

export class ModelRepository implements ModelOperations {
  constructor(private client: Client) {}

  private async query<TData, TVariables extends AnyVariables>(
    document: TypedDocumentString<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.query(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from query");
    }

    return result.data;
  }

  private async mutation<TData, TVariables extends AnyVariables>(
    document: TypedDocumentString<TData, TVariables>,
    variables: TVariables
  ): Promise<TData> {
    const result = await this.client.mutation(document, variables).toPromise();

    if (result.error) {
      throw GraphQLError.fromCombinedError(result.error);
    }

    if (!result.data) {
      throw new GraphQLError("No data returned from mutation");
    }

    return result.data;
  }

  async getPages(): Promise<Page[]> {
    logger.debug("Fetching pages from Saleor");
    const data = await this.query(GetPages, { first: 100 });
    const pages = data.pages?.edges?.map(edge => edge.node) ?? [];
    logger.debug(`Fetched ${pages.length} pages`);
    return pages as Page[];
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    logger.debug("Fetching page by slug", { slug });
    const data = await this.query(GetPageBySlug, { slug });
    return data.page as Page | null;
  }

  async createPage(input: PageCreateInput): Promise<Page> {
    logger.debug("Creating page", { title: input.title, slug: input.slug });
    const data = await this.mutation(CreatePage, { input });

    if (data.pageCreate?.errors && data.pageCreate.errors.length > 0) {
      const error = data.pageCreate.errors[0];
      throw new GraphQLError(`Failed to create page: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
        attributes: error.attributes,
      });
    }

    if (!data.pageCreate?.page) {
      throw new GraphQLError("Page creation returned no page");
    }

    logger.debug("Successfully created page", {
      id: data.pageCreate.page.id,
      title: data.pageCreate.page.title,
    });

    return data.pageCreate.page as Page;
  }

  async updatePage(id: string, input: PageInput): Promise<Page> {
    logger.debug("Updating page", { id, input });
    const data = await this.mutation(UpdatePage, { id, input });

    if (data.pageUpdate?.errors && data.pageUpdate.errors.length > 0) {
      const error = data.pageUpdate.errors[0];
      throw new GraphQLError(`Failed to update page: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
        attributes: error.attributes,
      });
    }

    if (!data.pageUpdate?.page) {
      throw new GraphQLError("Page update returned no page");
    }

    logger.debug("Successfully updated page", {
      id: data.pageUpdate.page.id,
      title: data.pageUpdate.page.title,
    });

    return data.pageUpdate.page as Page;
  }

  async updatePageAttributes(id: string, attributes: AttributeValueInput[]): Promise<void> {
    if (attributes.length === 0) {
      logger.debug("No attributes to update for page");
      return;
    }

    logger.debug("Updating page attributes", { id, attributeCount: attributes.length });
    const data = await this.mutation(UpdatePageAttributes, { id, input: attributes });

    if (data.pageAttributeAssign?.errors && data.pageAttributeAssign.errors.length > 0) {
      const error = data.pageAttributeAssign.errors[0];
      throw new GraphQLError(`Failed to update page attributes: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
        attributes: error.attributes,
      });
    }

    logger.debug("Successfully updated page attributes", { id });
  }

  async unassignPageAttributes(id: string, attributeIds: string[]): Promise<void> {
    if (attributeIds.length === 0) {
      logger.debug("No attributes to unassign from page");
      return;
    }

    logger.debug("Unassigning page attributes", { id, attributeCount: attributeIds.length });
    const data = await this.mutation(UnassignPageAttributes, { id, attributeIds });

    if (data.pageAttributeUnassign?.errors && data.pageAttributeUnassign.errors.length > 0) {
      const error = data.pageAttributeUnassign.errors[0];
      throw new GraphQLError(`Failed to unassign page attributes: ${error.message}`, {
        field: error.field ?? undefined,
        code: error.code ?? undefined,
        attributes: error.attributes,
      });
    }

    logger.debug("Successfully unassigned page attributes", { id });
  }
}