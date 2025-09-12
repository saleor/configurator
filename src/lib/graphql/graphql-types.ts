/**
 * GraphQL input types used throughout the application.
 * These are manually defined to match the Saleor GraphQL schema.
 */

export type CollectionChannelListingUpdateInput = {
  addChannels?: PublishableChannelListingInput[] | null;
  removeChannels?: string[] | null;
};

export type PublishableChannelListingInput = {
  channelId: string;
  isPublished?: boolean | null;
  publicationDate?: string | null;
  publishedAt?: string | null;
};

export type AttributeValueSelectableTypeInput = {
  id?: string | null;
  name?: string | null;
  value?: string | null;
  externalReference?: string | null;
};

export type AttributeValueInput = {
  id?: string | null;
  dropdown?: AttributeValueSelectableTypeInput | null;
  multiselect?: AttributeValueSelectableTypeInput[] | null;
  swatch?: AttributeValueSelectableTypeInput | null;
  numeric?: string | null;
  boolean?: boolean | null;
  date?: string | null;
  dateTime?: string | null;
  plainText?: string | null;
  richText?: string | null;
  references?: string[] | null;
  file?: string | null;
};
