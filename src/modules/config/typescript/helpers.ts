/**
 * TypeScript Configuration Helper Functions
 *
 * These helper functions provide a more discoverable and type-safe API
 * for creating Saleor configurations in TypeScript.
 */

import type { AttributeInput } from "./types";

/**
 * Attribute configuration helpers
 *
 * These utilities help create type-safe attribute definitions
 */
export const attribute = {
  /**
   * Create a plain text attribute
   */
  plainText: (name: string): AttributeInput => ({
    name,
    inputType: "PLAIN_TEXT",
  }),

  /**
   * Create a dropdown attribute with predefined values
   */
  dropdown: (name: string, values: string[]): AttributeInput => ({
    name,
    inputType: "DROPDOWN",
    values: values.map((name) => ({ name })),
  }),

  /**
   * Create a reference attribute that links to other entities
   */
  reference: (
    name: string,
    entityType: "PRODUCT" | "PRODUCT_VARIANT" | "PAGE" = "PRODUCT"
  ): AttributeInput => ({
    name,
    inputType: "REFERENCE",
    entityType,
  }),

  /**
   * Create a numeric attribute
   */
  numeric: (name: string): AttributeInput => ({
    name,
    inputType: "NUMERIC",
  }),

  /**
   * Create a boolean attribute
   */
  boolean: (name: string): AttributeInput => ({
    name,
    inputType: "BOOLEAN",
  }),

  /**
   * Create a date attribute
   */
  date: (name: string): AttributeInput => ({
    name,
    inputType: "DATE",
  }),

  /**
   * Create a datetime attribute
   */
  dateTime: (name: string): AttributeInput => ({
    name,
    inputType: "DATE_TIME",
  }),

  /**
   * Create a rich text attribute
   */
  richText: (name: string): AttributeInput => ({
    name,
    inputType: "RICH_TEXT",
  }),
};

/**
 * Utility helpers
 */
export const utils = {
  /**
   * Create attribute value objects from strings
   */
  attributeValues: (values: string[]): { name: string }[] => values.map((name) => ({ name })),
};
