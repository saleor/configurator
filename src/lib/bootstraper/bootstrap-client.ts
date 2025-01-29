import type { Client } from "@urql/core";
import { graphql, type VariablesOf, type ResultOf } from "gql.tada";

const createAttributeMutation = graphql(`
  mutation CreateAttribute($input: AttributeCreateInput!) {
    attributeCreate(input: $input) {
      attribute {
        id
        name
      }
      errors {
        message
        code
        field
      }
    }
  }
`);

type AttributeCreateInput = VariablesOf<
  typeof createAttributeMutation
>["input"];

const getAttributesByNamesQuery = graphql(`
  query GetAttributesByNames($names: [String!]!, $type: AttributeTypeEnum) {
    attributes(
      first: 100
      where: { name: { oneOf: $names }, type: { eq: $type } }
    ) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`);

type GetAttributesByNamesInput = VariablesOf<typeof getAttributesByNamesQuery>;

export type Attribute = NonNullable<
  NonNullable<ResultOf<typeof getAttributesByNamesQuery>["attributes"]>["edges"]
>[number]["node"];

const createProductTypeMutation = graphql(`
  mutation CreateProductType($input: ProductTypeInput!) {
    productTypeCreate(input: $input) {
      productType {
        id
        name
        productAttributes {
          id
          name
        }
      }
    }
  }
`);

export type ProductType = NonNullable<
  NonNullable<
    ResultOf<typeof createProductTypeMutation>["productTypeCreate"]
  >["productType"]
>;

type ProductTypeInput = VariablesOf<typeof createProductTypeMutation>["input"];

const assignAttributesToProductTypeMutation = graphql(`
  mutation AssignAttributesToProductType(
    $productTypeId: ID!
    $operations: [ProductAttributeAssignInput!]!
  ) {
    productAttributeAssign(
      productTypeId: $productTypeId
      operations: $operations
    ) {
      productType {
        id
      }
    }
  }
`);

const getProductTypeByNameQuery = graphql(`
  query GetProductTypeByName($name: String!) {
    productTypes(filter: { search: $name }, first: 1) {
      edges {
        node {
          id
          name
          productAttributes {
            id
            name
          }
        }
      }
    }
  }
`);

const createChannelMutation = graphql(`
  mutation CreateChannel($input: ChannelCreateInput!) {
    channelCreate(input: $input) {
      channel {
        id
        name
      }
    }
  }
`);

export type ChannelCreateInput = VariablesOf<
  typeof createChannelMutation
>["input"];

export type CountryCode = NonNullable<ChannelCreateInput["defaultCountry"]>;

const getChannelsQuery = graphql(`
  query GetChannels {
    channels {
      id
      name
    }
  }
`);

export type Channel = NonNullable<
  ResultOf<typeof getChannelsQuery>["channels"]
>[number];

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

type PageAttributeAssignInput = VariablesOf<typeof pageAttributeAssignMutation>;

const updateChannelMutation = graphql(`
  mutation UpdateChannel($id: ID!, $input: ChannelUpdateInput!) {
    channelUpdate(id: $id, input: $input) {
      channel {
        id
        name
        slug
        currencyCode
        defaultCountry {
          code
        }
      }
      errors {
        field
        message
      }
    }
  }
`);

type ChannelUpdateInput = VariablesOf<typeof updateChannelMutation>["input"];

/**
 * @description A client for bootstrapping the data models. It checks if the data models exist and creates them if they don't.
 */
export class BootstrapClient {
  constructor(private client: Client) {}

  async createAttribute(attributeInput: AttributeCreateInput) {
    const result = await this.client.mutation(createAttributeMutation, {
      input: attributeInput,
    });

    console.log(result.data?.attributeCreate?.errors);

    if (!result.data?.attributeCreate?.attribute) {
      throw new Error("Failed to create attribute", result.error);
    }

    return result.data?.attributeCreate?.attribute;
  }

  async getAttributesByNames(input: GetAttributesByNamesInput) {
    const result = await this.client.query(getAttributesByNamesQuery, {
      names: input.names,
      type: input.type,
    });

    return result.data?.attributes?.edges?.map((edge) => edge.node);
  }

  async assignAttributesToProductType({
    attributeIds,
    productTypeId,
  }: {
    attributeIds: string[];
    productTypeId: string;
  }) {
    const result = await this.client.mutation(
      assignAttributesToProductTypeMutation,
      {
        productTypeId,
        operations: attributeIds.map((id) => ({
          id,
          type: "PRODUCT" as const,
          variantSelection: false,
        })),
      }
    );

    if (!result.data?.productAttributeAssign?.productType) {
      throw new Error(
        "Failed to assign attributes to product type",
        result.error
      );
    }

    return result.data?.productAttributeAssign?.productType;
  }

  async createProductType(productTypeInput: ProductTypeInput) {
    const result = await this.client.mutation(createProductTypeMutation, {
      input: productTypeInput,
    });

    if (!result.data?.productTypeCreate?.productType) {
      throw new Error("Failed to create product type", result.error);
    }

    return result.data?.productTypeCreate?.productType;
  }

  async getProductTypeByName(name: string) {
    const result = await this.client.query(getProductTypeByNameQuery, {
      name,
    });

    const productType = result.data?.productTypes?.edges?.[0]?.node;

    return productType;
  }

  async getChannels() {
    const result = await this.client.query(getChannelsQuery, {});

    return result.data?.channels;
  }

  async createChannel(channelInput: ChannelCreateInput) {
    const result = await this.client.mutation(createChannelMutation, {
      input: channelInput,
    });

    if (!result.data?.channelCreate?.channel) {
      throw new Error("Failed to create channel", result.error);
    }

    return result.data?.channelCreate?.channel;
  }

  async createPageType(pageTypeInput: PageTypeCreateInput) {
    const result = await this.client.mutation(createPageTypeMutation, {
      input: pageTypeInput,
    });

    if (!result.data?.pageTypeCreate?.pageType) {
      throw new Error("Failed to create page type", result.error);
    }

    return result.data?.pageTypeCreate?.pageType;
  }

  async getPageTypeByName(name: string) {
    const result = await this.client.query(getPageTypeByNameQuery, {
      name,
    });

    const pageType = result.data?.pageTypes?.edges?.[0]?.node;

    return pageType;
  }

  async assignAttributesToPageType({
    attributeIds,
    pageTypeId,
  }: PageAttributeAssignInput) {
    const result = await this.client.mutation(pageAttributeAssignMutation, {
      pageTypeId,
      attributeIds,
    });

    console.log(result.data?.pageAttributeAssign?.errors);

    if (!result.data?.pageAttributeAssign?.pageType) {
      throw new Error("Failed to assign attributes to page type", result.error);
    }

    return result.data?.pageAttributeAssign?.pageType;
  }

  async updateChannel(id: string, input: ChannelUpdateInput) {
    const result = await this.client.mutation(updateChannelMutation, {
      id,
      input,
    });

    if (result.error) {
      throw new Error(`Failed to update channel: ${result.error.message}`);
    }

    if (result.data?.channelUpdate?.errors.length) {
      throw new Error(
        `Failed to update channel: ${result.data.channelUpdate.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }

    return result.data?.channelUpdate?.channel;
  }
}
