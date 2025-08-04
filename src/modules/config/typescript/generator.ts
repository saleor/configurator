/**
 * TypeScript Configuration Generator
 *
 * Generates TypeScript configuration code from SaleorConfig objects
 */

import type { CategoryInput, SaleorConfig } from "../schema/schema";
import type { AttributeInput } from "./types";

/**
 * Generate TypeScript configuration code from a SaleorConfig object
 */
export function generateTypeScriptConfig(config: SaleorConfig): string {
  const parts: string[] = [];

  // Add header
  parts.push('import { createSaleorConfig, attribute } from "@saleor/configurator";');
  parts.push("");
  parts.push("export default createSaleorConfig({");

  // Generate each section
  const sections: string[] = [];

  if (config.shop) {
    sections.push(generateShopSection(config.shop, 1));
  }

  if (config.channels?.length) {
    sections.push(generateChannelsSection(config.channels, 1));
  }

  if (config.productTypes?.length) {
    sections.push(generateProductTypesSection(config.productTypes, 1));
  }

  if (config.pageTypes?.length) {
    sections.push(generatePageTypesSection(config.pageTypes, 1));
  }

  if (config.categories?.length) {
    sections.push(generateCategoriesSection(config.categories, 1));
  }

  if (config.products?.length) {
    sections.push(generateProductsSection(config.products, 1));
  }

  parts.push(sections.join(",\n\n"));
  parts.push("});");

  return parts.join("\n");
}

/**
 * Generate shop configuration section
 */
function generateShopSection(shop: NonNullable<SaleorConfig["shop"]>, indent: number): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}shop: {`);

  const properties: string[] = [];
  if (shop.defaultMailSenderName !== undefined) {
    properties.push(
      `${spaces}  defaultMailSenderName: ${JSON.stringify(shop.defaultMailSenderName)}`
    );
  }
  if (shop.defaultMailSenderAddress !== undefined) {
    properties.push(
      `${spaces}  defaultMailSenderAddress: ${JSON.stringify(shop.defaultMailSenderAddress)}`
    );
  }
  if (shop.displayGrossPrices !== undefined) {
    properties.push(`${spaces}  displayGrossPrices: ${shop.displayGrossPrices}`);
  }
  if (shop.trackInventoryByDefault !== undefined) {
    properties.push(`${spaces}  trackInventoryByDefault: ${shop.trackInventoryByDefault}`);
  }
  if (shop.defaultWeightUnit !== undefined) {
    properties.push(`${spaces}  defaultWeightUnit: ${JSON.stringify(shop.defaultWeightUnit)}`);
  }
  if (shop.automaticFulfillmentDigitalProducts !== undefined) {
    properties.push(
      `${spaces}  automaticFulfillmentDigitalProducts: ${shop.automaticFulfillmentDigitalProducts}`
    );
  }
  if (shop.fulfillmentAutoApprove !== undefined) {
    properties.push(`${spaces}  fulfillmentAutoApprove: ${shop.fulfillmentAutoApprove}`);
  }
  if (shop.fulfillmentAllowUnpaid !== undefined) {
    properties.push(`${spaces}  fulfillmentAllowUnpaid: ${shop.fulfillmentAllowUnpaid}`);
  }
  if (shop.enableAccountConfirmationByEmail !== undefined) {
    properties.push(
      `${spaces}  enableAccountConfirmationByEmail: ${shop.enableAccountConfirmationByEmail}`
    );
  }
  if (shop.allowLoginWithoutConfirmation !== undefined) {
    properties.push(
      `${spaces}  allowLoginWithoutConfirmation: ${shop.allowLoginWithoutConfirmation}`
    );
  }

  lines.push(properties.join(",\n"));
  lines.push(`${spaces}}`);

  return lines.join("\n");
}

/**
 * Generate channels configuration section
 */
function generateChannelsSection(
  channels: NonNullable<SaleorConfig["channels"]>,
  indent: number
): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}channels: [`);

  const channelStrings = channels.map((channel) => {
    const channelLines: string[] = [];
    channelLines.push(`${spaces}  {`);

    channelLines.push(`${spaces}    name: ${JSON.stringify(channel.name)},`);
    channelLines.push(`${spaces}    slug: ${JSON.stringify(channel.slug)},`);
    channelLines.push(`${spaces}    currencyCode: ${JSON.stringify(channel.currencyCode)},`);
    channelLines.push(`${spaces}    defaultCountry: ${JSON.stringify(channel.defaultCountry)},`);
    if (channel.isActive !== undefined) {
      channelLines.push(`${spaces}    isActive: ${channel.isActive},`);
    }

    // Add settings if present
    if (channel.settings && Object.keys(channel.settings).length > 0) {
      channelLines.push(`${spaces}    settings: {`);
      const settingsProps: string[] = [];

      if (channel.settings.allocationStrategy !== undefined) {
        settingsProps.push(
          `${spaces}      allocationStrategy: ${JSON.stringify(channel.settings.allocationStrategy)}`
        );
      }
      if (channel.settings.automaticallyConfirmAllNewOrders !== undefined) {
        settingsProps.push(
          `${spaces}      automaticallyConfirmAllNewOrders: ${channel.settings.automaticallyConfirmAllNewOrders}`
        );
      }
      if (channel.settings.automaticallyFulfillNonShippableGiftCard !== undefined) {
        settingsProps.push(
          `${spaces}      automaticallyFulfillNonShippableGiftCard: ${channel.settings.automaticallyFulfillNonShippableGiftCard}`
        );
      }

      channelLines.push(settingsProps.join(",\n"));
      channelLines.push(`${spaces}    },`);
    }

    channelLines.push(`${spaces}  }`);
    return channelLines.join("\n");
  });

  lines.push(channelStrings.join(",\n"));
  lines.push(`${spaces}]`);

  return lines.join("\n");
}

/**
 * Generate product types configuration section
 */
function generateProductTypesSection(
  productTypes: NonNullable<SaleorConfig["productTypes"]>,
  indent: number
): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}productTypes: [`);

  const productTypeStrings = productTypes.map((productType) => {
    const ptLines: string[] = [];
    ptLines.push(`${spaces}  {`);

    ptLines.push(`${spaces}    name: ${JSON.stringify(productType.name)},`);
    if (productType.isShippingRequired !== undefined) {
      ptLines.push(`${spaces}    isShippingRequired: ${productType.isShippingRequired},`);
    }

    // Add product attributes
    if (productType.productAttributes?.length) {
      ptLines.push(`${spaces}    productAttributes: [`);
      const attrStrings = productType.productAttributes.map((attr) =>
        generateAttributeCode(attr as AttributeInput, indent + 3)
      );
      ptLines.push(attrStrings.join(",\n"));
      ptLines.push(`${spaces}    ],`);
    }

    // Add variant attributes
    if (productType.variantAttributes?.length) {
      ptLines.push(`${spaces}    variantAttributes: [`);
      const attrStrings = productType.variantAttributes.map((attr) =>
        generateAttributeCode(attr as AttributeInput, indent + 3)
      );
      ptLines.push(attrStrings.join(",\n"));
      ptLines.push(`${spaces}    ],`);
    }

    ptLines.push(`${spaces}  }`);
    return ptLines.join("\n");
  });

  lines.push(productTypeStrings.join(",\n"));
  lines.push(`${spaces}]`);

  return lines.join("\n");
}

/**
 * Generate page types configuration section
 */
function generatePageTypesSection(
  pageTypes: NonNullable<SaleorConfig["pageTypes"]>,
  indent: number
): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}pageTypes: [`);

  const pageTypeStrings = pageTypes.map((pageType) => {
    const ptLines: string[] = [];
    ptLines.push(`${spaces}  {`);

    ptLines.push(`${spaces}    name: ${JSON.stringify(pageType.name)},`);

    // Add attributes
    if ("attributes" in pageType && pageType.attributes?.length) {
      ptLines.push(`${spaces}    attributes: [`);
      const attrStrings = pageType.attributes.map((attr) =>
        generateAttributeCode(attr as AttributeInput, indent + 3)
      );
      ptLines.push(attrStrings.join(",\n"));
      ptLines.push(`${spaces}    ],`);
    }

    ptLines.push(`${spaces}  }`);
    return ptLines.join("\n");
  });

  lines.push(pageTypeStrings.join(",\n"));
  lines.push(`${spaces}]`);

  return lines.join("\n");
}

/**
 * Generate categories configuration section
 */
function generateCategoriesSection(
  categories: NonNullable<SaleorConfig["categories"]>,
  indent: number
): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}categories: [`);

  const categoryStrings = categories.map((category) => generateCategoryCode(category, indent + 1));

  lines.push(categoryStrings.join(",\n"));
  lines.push(`${spaces}]`);

  return lines.join("\n");
}

/**
 * Generate a single category (recursive for subcategories)
 */
function generateCategoryCode(category: CategoryInput, indent: number): string {
  const spaces = "  ".repeat(indent);
  const lines: string[] = [];

  lines.push(`${spaces}{`);
  lines.push(`${spaces}  name: ${JSON.stringify(category.name)},`);
  lines.push(`${spaces}  slug: ${JSON.stringify(category.slug)},`);

  // Handle subcategories recursively
  if ("subcategories" in category && category.subcategories?.length) {
    lines.push(`${spaces}  subcategories: [`);
    const subCategoryStrings = category.subcategories.map((sub) =>
      generateCategoryCode(sub, indent + 2)
    );
    lines.push(subCategoryStrings.join(",\n"));
    lines.push(`${spaces}  ],`);
  }

  lines.push(`${spaces}}`);
  return lines.join("\n");
}

/**
 * Generate products configuration section (simplified)
 */
function generateProductsSection(
  _products: NonNullable<SaleorConfig["products"]>,
  indent: number
): string {
  const spaces = "  ".repeat(indent);
  return `${spaces}// Products section would be generated here\n${spaces}// (Complex structure - typically managed separately)`;
}

/**
 * Generate attribute helper code
 */
function generateAttributeCode(attr: AttributeInput, indent: number): string {
  const spaces = "  ".repeat(indent);

  // Handle attribute reference
  if ("attribute" in attr) {
    return `${spaces}// Reference to existing attribute: ${attr.attribute}`;
  }

  switch (attr.inputType) {
    case "PLAIN_TEXT":
      return `${spaces}attribute.plainText(${JSON.stringify(attr.name)})`;

    case "DROPDOWN":
      if ("values" in attr && attr.values) {
        const valueNames = attr.values.map((v) => (typeof v === "string" ? v : v.name));
        return `${spaces}attribute.dropdown(${JSON.stringify(attr.name)}, ${JSON.stringify(valueNames)})`;
      }
      return `${spaces}attribute.dropdown(${JSON.stringify(attr.name)}, [])`;

    case "REFERENCE":
      if ("entityType" in attr) {
        return `${spaces}attribute.reference(${JSON.stringify(attr.name)}, ${JSON.stringify(attr.entityType)})`;
      }
      return `${spaces}attribute.reference(${JSON.stringify(attr.name)}, "PRODUCT")`;

    case "NUMERIC":
      return `${spaces}attribute.numeric(${JSON.stringify(attr.name)})`;

    case "BOOLEAN":
      return `${spaces}attribute.boolean(${JSON.stringify(attr.name)})`;

    case "DATE":
      return `${spaces}attribute.date(${JSON.stringify(attr.name)})`;

    case "DATE_TIME":
      return `${spaces}attribute.dateTime(${JSON.stringify(attr.name)})`;

    case "RICH_TEXT":
      return `${spaces}attribute.richText(${JSON.stringify(attr.name)})`;

    default:
      return `${spaces}// Unknown attribute type: ${JSON.stringify(attr)}`;
  }
}
