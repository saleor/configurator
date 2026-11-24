/**
 * Config/store pairs that pin how diff, deploy and introspect describe changes. Each scenario
 * runs through DiffService in both directions and every formatter, and the output is stored as
 * a readable snapshot, so a change to the diff pipeline shows up as a reviewable file diff.
 *
 * `config` is what config.yml holds; `store` is what introspect reads back from Saleor.
 */
interface DiffScenario {
  readonly name: string;
  readonly config: Record<string, unknown>;
  readonly store: Record<string, unknown>;
}

const channel = {
  name: "Default",
  slug: "default-channel",
  currencyCode: "USD",
  defaultCountry: "US",
  isActive: true,
  settings: { allocationStrategy: "PRIORITIZE_SORTING_ORDER", allowUnpaidOrders: false },
  taxConfiguration: { taxCalculationStrategy: "FLAT_RATES", chargeTaxes: true },
};

const tyreTree = [
  {
    name: "Tyres",
    slug: "tyres",
    subcategories: [
      {
        name: "Summer tyres",
        slug: "summer-tyres",
        subcategories: [{ name: "Car", slug: "summer-car" }],
      },
      { name: "Winter tyres", slug: "winter-tyres" },
    ],
  },
  { name: "Accessories", slug: "accessories" },
];

const product = {
  name: "Tee",
  slug: "tee",
  productType: "Apparel",
  category: "accessories",
  description: "A plain tee",
  attributes: { Color: "Red" },
  channelListings: [{ channel: "default-channel", isPublished: true, visibleInListings: true }],
  variants: [
    {
      name: "S",
      sku: "TEE-S",
      weight: 1,
      attributes: { Size: "S" },
      channelListings: [{ channel: "default-channel", price: 10 }],
    },
    {
      name: "M",
      sku: "TEE-M",
      weight: 1,
      attributes: { Size: "M" },
      channelListings: [{ channel: "default-channel", price: 10 }],
    },
  ],
  media: [{ externalUrl: "https://example.com/tee.png", alt: "Tee" }],
};

const warehouse = {
  name: "Main",
  slug: "main",
  email: "ops@example.com",
  isPrivate: false,
  clickAndCollectOption: "DISABLED",
  address: {
    streetAddress1: "1 Main St",
    city: "HELSINKI",
    postalCode: "00100",
    country: "FI",
  },
  shippingZones: ["Europe"],
};

const shippingZone = {
  name: "Europe",
  description: "EU",
  default: false,
  countries: ["DE", "FI"],
  warehouses: ["main"],
  channels: ["default-channel"],
  shippingMethods: [
    {
      name: "Standard",
      type: "PRICE",
      channelListings: [{ channel: "default-channel", price: 5, currency: "USD" }],
    },
    {
      name: "Express",
      type: "PRICE",
      channelListings: [{ channel: "default-channel", price: 15, currency: "USD" }],
    },
  ],
};

const menu = {
  name: "Navbar",
  slug: "navbar",
  items: [
    { name: "Home", url: "https://example.com" },
    {
      name: "Shop",
      category: "tyres",
      children: [{ name: "Summer", category: "summer-tyres" }],
    },
  ],
};

export const DIFF_SCENARIOS: readonly DiffScenario[] = [
  {
    name: "in-sync",
    config: { channels: [channel], categories: tyreTree, products: [product] },
    store: { channels: [channel], categories: tyreTree, products: [product] },
  },
  {
    name: "category-metadata-across-tree",
    config: {
      categories: [
        {
          name: "Tyres",
          slug: "tyres",
          metadata: { erpid: "4" },
          subcategories: [
            {
              name: "Summer tyres",
              slug: "summer-tyres",
              metadata: { erpid: "41", season: "summer" },
              subcategories: [{ name: "Car", slug: "summer-car", metadata: { erpid: "411" } }],
            },
            { name: "Winter tyres", slug: "winter-tyres" },
          ],
        },
        { name: "Accessories", slug: "accessories", metadata: { erpid: "5" } },
      ],
    },
    store: { categories: tyreTree },
  },
  {
    name: "category-subcategory-renamed",
    config: {
      categories: [
        {
          ...tyreTree[0],
          subcategories: [
            {
              name: "Summer tyres (new)",
              slug: "summer-tyres",
              subcategories: [{ name: "Passenger car", slug: "summer-car" }],
            },
            { name: "Winter tyres", slug: "winter-tyres" },
          ],
        },
        tyreTree[1],
      ],
    },
    store: { categories: tyreTree },
  },
  {
    name: "category-subcategory-added-and-missing",
    config: {
      categories: [
        {
          name: "Tyres",
          slug: "tyres",
          subcategories: [
            {
              name: "Summer tyres",
              slug: "summer-tyres",
              subcategories: [
                { name: "Car", slug: "summer-car" },
                { name: "Van", slug: "summer-van" },
              ],
            },
          ],
        },
        tyreTree[1],
      ],
    },
    store: { categories: tyreTree },
  },
  {
    name: "category-subcategory-moved",
    config: {
      categories: [
        {
          name: "Tyres",
          slug: "tyres",
          subcategories: [{ name: "Summer tyres", slug: "summer-tyres" }],
        },
        {
          name: "Accessories",
          slug: "accessories",
          subcategories: [{ name: "Winter tyres", slug: "winter-tyres" }],
        },
      ],
    },
    store: {
      categories: [
        {
          name: "Tyres",
          slug: "tyres",
          subcategories: [
            { name: "Summer tyres", slug: "summer-tyres" },
            { name: "Winter tyres", slug: "winter-tyres" },
          ],
        },
        { name: "Accessories", slug: "accessories" },
      ],
    },
  },
  {
    name: "category-top-level-created-and-only-in-store",
    config: { categories: [tyreTree[0], { name: "Rims", slug: "rims" }] },
    store: { categories: tyreTree },
  },
  {
    name: "channel-fields-settings-tax",
    config: {
      channels: [
        {
          ...channel,
          name: "Default EU",
          currencyCode: "EUR",
          settings: { allocationStrategy: "PRIORITIZE_HIGH_STOCK", allowUnpaidOrders: false },
          taxConfiguration: { taxCalculationStrategy: "FLAT_RATES", chargeTaxes: false },
        },
        { ...channel, name: "B2B", slug: "b2b" },
      ],
    },
    store: { channels: [channel] },
  },
  {
    name: "shop-settings",
    config: { shop: { defaultMailSenderName: "Shop", trackInventoryByDefault: false } },
    store: {
      shop: {
        defaultMailSenderName: "Old shop",
        trackInventoryByDefault: true,
        limitQuantityPerCheckout: 50,
      },
    },
  },
  {
    name: "attributes-values-and-type",
    config: {
      productAttributes: [
        { name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }, { name: "Blue" }] },
        { name: "Related", inputType: "REFERENCE", entityType: "PRODUCT" },
        { name: "Notes", inputType: "RICH_TEXT" },
      ],
      contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
    },
    store: {
      productAttributes: [
        { name: "Color", inputType: "DROPDOWN", values: [{ name: "Red" }, { name: "Green" }] },
        { name: "Related", inputType: "REFERENCE", entityType: "PAGE" },
        { name: "Notes", inputType: "PLAIN_TEXT" },
        { name: "Legacy", inputType: "DROPDOWN", values: [{ name: "X" }] },
      ],
      contentAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
    },
  },
  {
    name: "product-type-attributes",
    config: {
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }, { attribute: "Material" }],
          variantAttributes: [{ attribute: "Size", variantSelection: true }],
        },
        { name: "Gift card", productAttributes: [{ attribute: "Value" }] },
      ],
    },
    store: {
      productTypes: [
        {
          name: "Apparel",
          productAttributes: [{ attribute: "Color" }, { attribute: "Fit" }],
          variantAttributes: [{ attribute: "Size", variantSelection: false }],
        },
      ],
    },
  },
  {
    name: "page-and-model-types",
    config: {
      pageTypes: [{ name: "Blog post", attributes: [{ attribute: "Author" }] }],
      modelTypes: [{ name: "Banner", attributes: [{ attribute: "Headline" }] }],
    },
    store: {
      pageTypes: [{ name: "Blog post", attributes: [{ attribute: "Summary" }] }],
      modelTypes: [
        { name: "Banner", attributes: [] },
        { name: "Promo", attributes: [] },
      ],
    },
  },
  {
    name: "customer-types",
    config: {
      customerTypes: [
        {
          name: "Wholesale",
          slug: "wholesale",
          isDefault: true,
          attributes: [{ attribute: "VAT" }],
        },
      ],
    },
    store: {
      customerTypes: [
        { name: "Wholesale buyers", slug: "wholesale", attributes: [{ attribute: "Region" }] },
        { name: "Retail", slug: "retail", isDefault: false, attributes: [] },
      ],
    },
  },
  {
    name: "product-fields-variants-listings-media",
    config: {
      products: [
        {
          ...product,
          name: "Classic tee",
          category: "tyres",
          description: "A plain cotton tee",
          attributes: { Color: ["Red", "Blue"] },
          channelListings: [
            { channel: "default-channel", isPublished: false, visibleInListings: true },
            { channel: "b2b", isPublished: true },
          ],
          variants: [
            {
              ...product.variants[0],
              weight: 2,
              attributes: { Size: "Small" },
              channelListings: [{ channel: "default-channel", price: 12 }],
            },
            {
              name: "L",
              sku: "TEE-L",
              attributes: { Size: "L" },
              channelListings: [{ channel: "default-channel", price: 11 }],
            },
          ],
          media: [{ externalUrl: "https://example.com/tee-2.png" }],
        },
        { ...product, name: "Hoodie", slug: "hoodie", variants: [] },
      ],
    },
    store: { products: [product] },
  },
  {
    name: "collections",
    config: {
      collections: [
        {
          name: "Summer",
          slug: "summer",
          description: "Summer picks",
          products: ["tee", "hoodie"],
          channelListings: [{ channelSlug: "default-channel", isPublished: true }],
        },
      ],
    },
    store: {
      collections: [
        {
          name: "Summer sale",
          slug: "summer",
          products: ["tee"],
          channelListings: [{ channelSlug: "default-channel", isPublished: false }],
        },
        { name: "Winter", slug: "winter", products: [], channelListings: [] },
      ],
    },
  },
  {
    name: "menus",
    config: {
      menus: [
        {
          ...menu,
          items: [
            {
              name: "Shop",
              category: "accessories",
              children: [
                { name: "Summer", category: "summer-tyres" },
                { name: "Winter", category: "winter-tyres" },
              ],
            },
            { name: "Home", url: "https://example.com/home" },
            { name: "Blog", url: "https://example.com/blog" },
          ],
        },
      ],
    },
    store: { menus: [menu, { name: "Footer", slug: "footer", items: [] }] },
  },
  {
    name: "models",
    config: {
      models: [
        {
          title: "About us",
          slug: "about",
          modelType: "Page",
          content: "Hello",
          isPublished: true,
          attributes: { Author: "Ann", Tags: ["a", "b"] },
        },
      ],
    },
    store: {
      models: [
        {
          title: "About",
          slug: "about",
          modelType: "Page",
          content: "Hi",
          isPublished: false,
          attributes: { Author: "Bob", Tags: ["b", "a"] },
        },
      ],
    },
  },
  {
    name: "warehouses",
    config: {
      warehouses: [
        {
          ...warehouse,
          email: "",
          isPrivate: true,
          address: { ...warehouse.address, city: "Helsinki", postalCode: "00200" },
          shippingZones: ["Europe", "Nordics"],
          metadata: { erpid: "W1" },
        },
        { ...warehouse, name: "Backup", slug: "backup" },
      ],
    },
    store: { warehouses: [warehouse] },
  },
  {
    name: "shipping-zones-and-methods",
    config: {
      shippingZones: [
        {
          ...shippingZone,
          description: "European Union",
          countries: ["FI", "SE", "DE"],
          channels: ["default-channel", "b2b"],
          metadata: { region: "eu" },
          shippingMethods: [
            {
              ...shippingZone.shippingMethods[0],
              channelListings: [{ channel: "default-channel", price: 6, currency: "USD" }],
              metadata: { carrier: "dhl" },
            },
            { name: "Pickup", type: "PRICE", channelListings: [] },
          ],
        },
      ],
    },
    store: { shippingZones: [shippingZone] },
  },
  {
    name: "tax-classes",
    config: {
      taxClasses: [
        {
          name: "Standard",
          countryRates: [
            { countryCode: "FI", rate: 25.5 },
            { countryCode: "SE", rate: 25 },
          ],
        },
        { name: "Reduced", countryRates: [{ countryCode: "FI", rate: 14 }] },
      ],
    },
    store: {
      taxClasses: [
        {
          name: "Standard",
          countryRates: [
            { countryCode: "FI", rate: 24 },
            { countryCode: "DE", rate: 19 },
          ],
        },
      ],
    },
  },
];
