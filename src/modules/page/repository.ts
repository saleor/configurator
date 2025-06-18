import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_PAGES = gql`
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
          }
          attributes {
            attribute {
              id
              slug
              name
            }
            values {
              id
              slug
              name
              value
              plainText
              richText
              boolean
              date
              dateTime
              reference
              file {
                url
              }
            }
          }
        }
      }
    }
  }
`;

const GET_PAGE = gql`
  query GetPage($id: ID, $slug: String) {
    page(id: $id, slug: $slug) {
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
      }
      attributes {
        attribute {
          id
          slug
          name
        }
        values {
          id
          slug
          name
          value
          plainText
          richText
          boolean
          date
          dateTime
          reference
          file {
            url
          }
        }
      }
    }
  }
`;

const CREATE_PAGE = gql`
  mutation CreatePage($input: PageCreateInput!) {
    pageCreate(input: $input) {
      page {
        id
        title
        slug
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`;

const UPDATE_PAGE = gql`
  mutation UpdatePage($id: ID!, $input: PageInput!) {
    pageUpdate(id: $id, input: $input) {
      page {
        id
        title
        slug
      }
      errors {
        field
        message
        code
        attributes
      }
    }
  }
`;

const PAGE_ATTRIBUTES_UPDATE = gql`
  mutation PageAttributesUpdate($id: ID!, $attributes: [AttributeValueInput!]!) {
    pageAttributesUpdate(id: $id, attributes: $attributes) {
      page {
        id
        attributes {
          attribute {
            id
            slug
          }
          values {
            id
            slug
            name
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
`;

const DELETE_PAGE = gql`
  mutation DeletePage($id: ID!) {
    pageDelete(id: $id) {
      page {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface Page {
  id: string;
  title: string;
  slug: string;
  content?: string;
  isPublished: boolean;
  publishedAt?: string;
  pageType?: {
    id: string;
    name: string;
    slug: string;
  };
  attributes?: Array<{
    attribute: {
      id: string;
      slug: string;
      name: string;
    };
    values: Array<{
      id?: string;
      slug?: string;
      name?: string;
      value?: string;
      plainText?: string;
      richText?: string;
      boolean?: boolean;
      date?: string;
      dateTime?: string;
      reference?: string;
      file?: { url: string };
    }>;
  }>;
}

export class PageRepository {
  constructor(private readonly client: Client) {}

  async getPages(): Promise<Page[]> {
    const result = await this.client
      .query(GET_PAGES, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch pages: ${result.error.message}`);
    }
    
    return result.data?.pages.edges.map((edge: any) => edge.node) || [];
  }

  async getPage(idOrSlug: { id?: string; slug?: string }): Promise<Page | null> {
    const result = await this.client
      .query(GET_PAGE, idOrSlug)
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch page: ${result.error.message}`);
    }
    
    return result.data?.page || null;
  }

  async createPage(input: any): Promise<Page> {
    const result = await this.client
      .mutation(CREATE_PAGE, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create page: ${result.error.message}`);
    }
    
    const { page, errors } = result.data?.pageCreate || {};
    if (errors?.length) {
      throw new Error(
        `Page creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return page;
  }

  async updatePage(id: string, input: any): Promise<Page> {
    const result = await this.client
      .mutation(UPDATE_PAGE, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update page: ${result.error.message}`);
    }
    
    const { page, errors } = result.data?.pageUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Page update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return page;
  }

  async updatePageAttributes(id: string, attributes: any[]): Promise<Page> {
    const result = await this.client
      .mutation(PAGE_ATTRIBUTES_UPDATE, { id, attributes })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update page attributes: ${result.error.message}`);
    }
    
    const { page, errors } = result.data?.pageAttributesUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Page attributes update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return page;
  }

  async deletePage(id: string): Promise<void> {
    const result = await this.client
      .mutation(DELETE_PAGE, { id })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to delete page: ${result.error.message}`);
    }
    
    const { errors } = result.data?.pageDelete || {};
    if (errors?.length) {
      throw new Error(
        `Page deletion failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
  }
} 