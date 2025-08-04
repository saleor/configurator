/**
 * Example TypeScript Configuration for Saleor Configurator
 *
 * This file demonstrates how to create a Saleor configuration using TypeScript
 * with full type safety, autocompletion, and validation.
 *
 * To use this configuration:
 * 1. Install TypeScript dependencies: `npm install -D typescript tsx`
 * 2. Run with TypeScript support: `pnpm dlx @saleor/configurator deploy --config example-config.ts`
 */

import type { CountryCode, CurrencyCode } from "./src/modules/config/typescript";
import { attribute, createSaleorConfig } from "./src/modules/config/typescript";

// You can use variables and computed values!
const storeName = "My E-commerce Store";
const supportEmail = `support@${storeName.toLowerCase().replace(/\s+/g, "")}.com`;

// Reusable attribute definitions
const commonProductAttributes = [
  attribute.plainText("Brand"),
  attribute.dropdown("Color", ["Red", "Blue", "Green", "Black", "White"]),
  attribute.numeric("Weight"),
  attribute.boolean("Is Certified"),
];

const commonVariantAttributes = [attribute.dropdown("Size", ["XS", "S", "M", "L", "XL", "XXL"])];

// Helper function to create channels
const createChannel = (
  name: string,
  currency: CurrencyCode,
  country: CountryCode,
  slug?: string
) => ({
  name: `${name} Store`,
  slug: slug || name.toLowerCase(),
  currencyCode: currency,
  defaultCountry: country,
  isActive: true,
  settings: {
    allocationStrategy: "PRIORITIZE_SORTING_ORDER" as const,
    automaticallyConfirmAllNewOrders: true,
    automaticallyFulfillNonShippableGiftCard: true,
  },
});

// Main configuration
export default createSaleorConfig({
  // Shop settings
  shop: {
    defaultMailSenderName: storeName,
    defaultMailSenderAddress: supportEmail,
    displayGrossPrices: true,
    trackInventoryByDefault: true,
    defaultWeightUnit: "KG",
    automaticFulfillmentDigitalProducts: true,
    fulfillmentAutoApprove: false,
    enableAccountConfirmationByEmail: true,
    allowLoginWithoutConfirmation: false,
  },

  // Sales channels - using helper function for consistency
  channels: [
    createChannel("US", "USD", "US"),
    createChannel("EU", "EUR", "DE"),
    createChannel("UK", "GBP", "GB"),
    createChannel("Canada", "CAD", "CA"),
  ],

  // Product types with rich attribute definitions
  productTypes: [
    {
      name: "Electronics",
      isShippingRequired: true,
      productAttributes: [
        ...commonProductAttributes,
        attribute.dropdown("Warranty", ["1 Year", "2 Years", "3 Years", "Lifetime"]),
        attribute.reference("Related Products", "PRODUCT"),
        attribute.date("Release Date"),
      ],
      variantAttributes: [
        ...commonVariantAttributes,
        attribute.dropdown("Storage", ["64GB", "128GB", "256GB", "512GB", "1TB"]),
      ],
    },

    {
      name: "Clothing",
      isShippingRequired: true,
      productAttributes: [
        ...commonProductAttributes,
        attribute.dropdown("Material", ["Cotton", "Polyester", "Wool", "Silk", "Linen"]),
        attribute.dropdown("Season", ["Spring", "Summer", "Fall", "Winter", "All Season"]),
      ],
      variantAttributes: [
        ...commonVariantAttributes,
        attribute.dropdown("Fit", ["Slim", "Regular", "Relaxed", "Oversized"]),
      ],
    },

    {
      name: "Digital Products",
      isShippingRequired: false,
      productAttributes: [
        attribute.plainText("License Type"),
        attribute.dropdown("Format", ["PDF", "EPUB", "MP3", "MP4", "ZIP"]),
        attribute.numeric("File Size"),
        attribute.boolean("Requires Account"),
      ],
      variantAttributes: [],
    },

    {
      name: "Books",
      isShippingRequired: true,
      productAttributes: [
        attribute.plainText("Author"),
        attribute.plainText("ISBN"),
        attribute.dropdown("Genre", [
          "Fiction",
          "Non-Fiction",
          "Science Fiction",
          "Mystery",
          "Romance",
          "Biography",
          "Technical",
          "Children's",
        ]),
        attribute.numeric("Pages"),
        attribute.date("Publication Date"),
        attribute.reference("Related Books", "PRODUCT"),
      ],
      variantAttributes: [
        attribute.dropdown("Format", ["Hardcover", "Paperback", "E-book", "Audiobook"]),
      ],
    },
  ],

  // Page types for CMS content
  pageTypes: [
    {
      name: "Blog Post",
      attributes: [
        attribute.plainText("Author"),
        attribute.date("Publication Date"),
        attribute.dropdown("Category", ["News", "Tutorial", "Review", "Opinion"]),
        attribute.richText("Excerpt"),
        attribute.boolean("Featured"),
      ],
    },

    {
      name: "Landing Page",
      attributes: [
        attribute.plainText("Hero Title"),
        attribute.richText("Hero Description"),
        attribute.plainText("CTA Text"),
        attribute.plainText("CTA URL"),
        attribute.boolean("Show Newsletter Signup"),
      ],
    },

    {
      name: "FAQ",
      attributes: [
        attribute.dropdown("Category", ["Shipping", "Returns", "Payment", "Account", "General"]),
        attribute.numeric("Display Order"),
        attribute.boolean("Featured Question"),
      ],
    },
  ],

  // Category hierarchy
  categories: [
    {
      name: "Electronics",
      slug: "electronics",
      subcategories: [
        {
          name: "Smartphones",
          slug: "smartphones",
        },
        {
          name: "Laptops",
          slug: "laptops",
          subcategories: [
            { name: "Gaming Laptops", slug: "gaming-laptops" },
            { name: "Business Laptops", slug: "business-laptops" },
            { name: "Ultrabooks", slug: "ultrabooks" },
          ],
        },
        {
          name: "Accessories",
          slug: "electronics-accessories",
          subcategories: [
            { name: "Chargers", slug: "chargers" },
            { name: "Cases", slug: "cases" },
            { name: "Screen Protectors", slug: "screen-protectors" },
          ],
        },
      ],
    },

    {
      name: "Clothing",
      slug: "clothing",
      subcategories: [
        {
          name: "Men's Clothing",
          slug: "mens-clothing",
          subcategories: [
            { name: "Shirts", slug: "mens-shirts" },
            { name: "Pants", slug: "mens-pants" },
            { name: "Jackets", slug: "mens-jackets" },
          ],
        },
        {
          name: "Women's Clothing",
          slug: "womens-clothing",
          subcategories: [
            { name: "Dresses", slug: "womens-dresses" },
            { name: "Tops", slug: "womens-tops" },
            { name: "Bottoms", slug: "womens-bottoms" },
          ],
        },
        {
          name: "Accessories",
          slug: "clothing-accessories",
          subcategories: [
            { name: "Hats", slug: "hats" },
            { name: "Belts", slug: "belts" },
            { name: "Bags", slug: "bags" },
          ],
        },
      ],
    },

    {
      name: "Books",
      slug: "books",
      subcategories: [
        { name: "Fiction", slug: "fiction" },
        { name: "Non-Fiction", slug: "non-fiction" },
        { name: "Technical", slug: "technical-books" },
        { name: "Children's Books", slug: "childrens-books" },
      ],
    },

    {
      name: "Digital Products",
      slug: "digital-products",
      subcategories: [
        { name: "Software", slug: "software" },
        { name: "E-books", slug: "ebooks" },
        { name: "Music", slug: "digital-music" },
        { name: "Courses", slug: "online-courses" },
      ],
    },
  ],

  // Example products (optional - usually managed separately)
  products: [
    {
      name: "Premium Laptop",
      slug: "premium-laptop",
      productType: "Electronics",
      category: "laptops",
      attributes: {
        Brand: "TechCorp",
        Color: "Silver",
        Weight: "2.1",
        "Is Certified": "true",
        Warranty: "3 Years",
      },
      variants: [
        {
          name: "Premium Laptop - 256GB",
          sku: "LAPTOP-PREM-256",
          weight: 2.1,
          attributes: {
            Size: "13 inch",
            Storage: "256GB",
          },
          channelListings: [
            { channel: "us", price: 1299.99 },
            { channel: "eu", price: 1199.99 },
            { channel: "uk", price: 999.99 },
          ],
        },
        {
          name: "Premium Laptop - 512GB",
          sku: "LAPTOP-PREM-512",
          weight: 2.1,
          attributes: {
            Size: "13 inch",
            Storage: "512GB",
          },
          channelListings: [
            { channel: "us", price: 1599.99 },
            { channel: "eu", price: 1499.99 },
            { channel: "uk", price: 1299.99 },
          ],
        },
      ],
      channelListings: [
        {
          channel: "us",
          isPublished: true,
          visibleInListings: true,
        },
        {
          channel: "eu",
          isPublished: true,
          visibleInListings: true,
        },
        {
          channel: "uk",
          isPublished: true,
          visibleInListings: true,
        },
      ],
    },
  ],
});
