import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const TRANSLATION_FIELDS = gql`
  fragment TranslationFields on TranslatableItem {
    __typename
    ... on Product {
      id
      name
      description
      seoTitle
      seoDescription
      translation(languageCode: $languageCode) {
        id
        name
        description
        seoTitle
        seoDescription
      }
    }
    ... on Collection {
      id
      name
      description
      seoTitle
      seoDescription
      translation(languageCode: $languageCode) {
        id
        name
        description
        seoTitle
        seoDescription
      }
    }
    ... on Category {
      id
      name
      description
      seoTitle
      seoDescription
      translation(languageCode: $languageCode) {
        id
        name
        description
        seoTitle
        seoDescription
      }
    }
    ... on ProductVariant {
      id
      name
      translation(languageCode: $languageCode) {
        id
        name
      }
    }
    ... on Page {
      id
      title
      content
      seoTitle
      seoDescription
      translation(languageCode: $languageCode) {
        id
        title
        content
        seoTitle
        seoDescription
      }
    }
    ... on ShippingMethod {
      id
      name
      description
      translation(languageCode: $languageCode) {
        id
        name
        description
      }
    }
    ... on MenuItem {
      id
      name
      translation(languageCode: $languageCode) {
        id
        name
      }
    }
    ... on Attribute {
      id
      name
      translation(languageCode: $languageCode) {
        id
        name
      }
    }
    ... on AttributeValue {
      id
      name
      translation(languageCode: $languageCode) {
        id
        name
      }
    }
  }
`;

const PRODUCT_TRANSLATE = gql`
  mutation ProductTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: TranslationInput!
  ) {
    productTranslate(id: $id, languageCode: $languageCode, input: $input) {
      product {
        id
        translation(languageCode: $languageCode) {
          id
          name
          description
          seoTitle
          seoDescription
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

const COLLECTION_TRANSLATE = gql`
  mutation CollectionTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: TranslationInput!
  ) {
    collectionTranslate(id: $id, languageCode: $languageCode, input: $input) {
      collection {
        id
        translation(languageCode: $languageCode) {
          id
          name
          description
          seoTitle
          seoDescription
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

const CATEGORY_TRANSLATE = gql`
  mutation CategoryTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: TranslationInput!
  ) {
    categoryTranslate(id: $id, languageCode: $languageCode, input: $input) {
      category {
        id
        translation(languageCode: $languageCode) {
          id
          name
          description
          seoTitle
          seoDescription
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

const PRODUCT_VARIANT_TRANSLATE = gql`
  mutation ProductVariantTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: NameTranslationInput!
  ) {
    productVariantTranslate(id: $id, languageCode: $languageCode, input: $input) {
      productVariant {
        id
        translation(languageCode: $languageCode) {
          id
          name
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

const PAGE_TRANSLATE = gql`
  mutation PageTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: PageTranslationInput!
  ) {
    pageTranslate(id: $id, languageCode: $languageCode, input: $input) {
      page {
        id
        translation(languageCode: $languageCode) {
          id
          title
          content
          seoTitle
          seoDescription
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

const SHIPPING_METHOD_TRANSLATE = gql`
  mutation ShippingMethodTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: TranslationInput!
  ) {
    shippingPriceTranslate(id: $id, languageCode: $languageCode, input: $input) {
      shippingMethod {
        id
        translation(languageCode: $languageCode) {
          id
          name
          description
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

const MENU_ITEM_TRANSLATE = gql`
  mutation MenuItemTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: NameTranslationInput!
  ) {
    menuItemTranslate(id: $id, languageCode: $languageCode, input: $input) {
      menuItem {
        id
        translation(languageCode: $languageCode) {
          id
          name
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

const ATTRIBUTE_TRANSLATE = gql`
  mutation AttributeTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: NameTranslationInput!
  ) {
    attributeTranslate(id: $id, languageCode: $languageCode, input: $input) {
      attribute {
        id
        translation(languageCode: $languageCode) {
          id
          name
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

const ATTRIBUTE_VALUE_TRANSLATE = gql`
  mutation AttributeValueTranslate(
    $id: ID!
    $languageCode: LanguageCodeEnum!
    $input: AttributeValueTranslationInput!
  ) {
    attributeValueTranslate(id: $id, languageCode: $languageCode, input: $input) {
      attributeValue {
        id
        translation(languageCode: $languageCode) {
          id
          name
          richText
          plainText
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

export interface Translation {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  richText?: string;
  plainText?: string;
}

export interface TranslationInput {
  name?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface NameTranslationInput {
  name?: string;
}

export interface PageTranslationInput {
  title?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface AttributeValueTranslationInput {
  name?: string;
  richText?: string;
  plainText?: string;
}

export class TranslationRepository {
  constructor(private readonly client: Client) {}

  async translateProduct(
    id: string,
    languageCode: string,
    input: TranslationInput
  ) {
    const result = await this.client
      .mutation(PRODUCT_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate product: ${result.error.message}`);
    }

    const { product, errors } = result.data?.productTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Product translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return product;
  }

  async translateCollection(
    id: string,
    languageCode: string,
    input: TranslationInput
  ) {
    const result = await this.client
      .mutation(COLLECTION_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate collection: ${result.error.message}`);
    }

    const { collection, errors } = result.data?.collectionTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Collection translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return collection;
  }

  async translateCategory(
    id: string,
    languageCode: string,
    input: TranslationInput
  ) {
    const result = await this.client
      .mutation(CATEGORY_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate category: ${result.error.message}`);
    }

    const { category, errors } = result.data?.categoryTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Category translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return category;
  }

  async translateProductVariant(
    id: string,
    languageCode: string,
    input: NameTranslationInput
  ) {
    const result = await this.client
      .mutation(PRODUCT_VARIANT_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate product variant: ${result.error.message}`);
    }

    const { productVariant, errors } = result.data?.productVariantTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Product variant translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return productVariant;
  }

  async translatePage(
    id: string,
    languageCode: string,
    input: PageTranslationInput
  ) {
    const result = await this.client
      .mutation(PAGE_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate page: ${result.error.message}`);
    }

    const { page, errors } = result.data?.pageTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Page translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return page;
  }

  async translateShippingMethod(
    id: string,
    languageCode: string,
    input: TranslationInput
  ) {
    const result = await this.client
      .mutation(SHIPPING_METHOD_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate shipping method: ${result.error.message}`);
    }

    const { shippingMethod, errors } = result.data?.shippingPriceTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Shipping method translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return shippingMethod;
  }

  async translateMenuItem(
    id: string,
    languageCode: string,
    input: NameTranslationInput
  ) {
    const result = await this.client
      .mutation(MENU_ITEM_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate menu item: ${result.error.message}`);
    }

    const { menuItem, errors } = result.data?.menuItemTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Menu item translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return menuItem;
  }

  async translateAttribute(
    id: string,
    languageCode: string,
    input: NameTranslationInput
  ) {
    const result = await this.client
      .mutation(ATTRIBUTE_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate attribute: ${result.error.message}`);
    }

    const { attribute, errors } = result.data?.attributeTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Attribute translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return attribute;
  }

  async translateAttributeValue(
    id: string,
    languageCode: string,
    input: AttributeValueTranslationInput
  ) {
    const result = await this.client
      .mutation(ATTRIBUTE_VALUE_TRANSLATE, { id, languageCode, input })
      .toPromise();

    if (result.error) {
      throw new Error(`Failed to translate attribute value: ${result.error.message}`);
    }

    const { attributeValue, errors } = result.data?.attributeValueTranslate || {};
    if (errors?.length) {
      throw new Error(
        `Attribute value translation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }

    return attributeValue;
  }
} 