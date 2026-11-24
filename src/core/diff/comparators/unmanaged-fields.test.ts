import { describe, expect, it } from "vitest";
import type { SaleorConfig } from "../../../modules/config/schema/schema";
import { channelComparator } from "./channel-comparator";
import { productComparator } from "./product-comparator";
import { shopComparator } from "./shop-comparator";

const deployDirection = { skipUnmanagedFields: true } as const;

type Channel = NonNullable<SaleorConfig["channels"]>[number];
type Product = NonNullable<SaleorConfig["products"]>[number];

const handWrittenChannel: Channel = {
  name: "Main",
  slug: "main",
  currencyCode: "USD",
  defaultCountry: "US",
  isActive: true,
};

const introspectedChannel: Channel = {
  ...handWrittenChannel,
  settings: {
    allocationStrategy: "PRIORITIZE_SORTING_ORDER",
    automaticallyConfirmAllNewOrders: true,
    expireOrdersAfter: 60,
    markAsPaidStrategy: "TRANSACTION_FLOW",
  },
  taxConfiguration: { chargeTaxes: true, taxCalculationStrategy: "FLAT_RATES" },
};

const handWrittenProduct: Product = {
  name: "Tee",
  slug: "tee",
  productType: "Shirt",
  category: "shirts",
  channelListings: [{ channel: "main", isPublished: true, visibleInListings: true }],
  variants: [
    {
      name: "Tee M",
      sku: "TEE-M",
      attributes: {},
      channelListings: [{ channel: "main", price: 20 }],
    },
  ],
};

const introspectedProduct: Product = {
  ...handWrittenProduct,
  channelListings: [
    {
      channel: "main",
      isPublished: true,
      visibleInListings: true,
      publishedAt: "2026-11-19T13:22:40.000Z",
    },
  ],
  variants: [
    {
      name: "Tee M",
      sku: "TEE-M",
      attributes: {},
      weight: 0.3,
      channelListings: [{ channel: "main", price: 20, costPrice: 8 }],
    },
  ],
};

describe("fields the config leaves out (deploy direction)", () => {
  it("ignores channel settings and tax configuration the config omits", () => {
    const results = channelComparator.compare(
      [handWrittenChannel],
      [introspectedChannel],
      deployDirection
    );

    expect(results).toEqual([]);
  });

  it("still reports a channel setting the config declares", () => {
    const results = channelComparator.compare(
      [{ ...handWrittenChannel, settings: { expireOrdersAfter: 30 } }],
      [introspectedChannel],
      deployDirection
    );

    expect(results).toHaveLength(1);
    expect(results[0].changes?.map((c) => c.field)).toEqual(["settings.expireOrdersAfter"]);
  });

  it("ignores shop settings the config omits", () => {
    const results = shopComparator.compare(
      { defaultMailSenderName: "Store" },
      {
        defaultMailSenderName: "Store",
        trackInventoryByDefault: true,
        limitQuantityPerCheckout: 50,
      },
      deployDirection
    );

    expect(results).toEqual([]);
  });

  it("ignores listing dates, variant weight and cost price the config omits", () => {
    const results = productComparator.compare(
      [handWrittenProduct],
      [introspectedProduct],
      deployDirection
    );

    expect(results).toEqual([]);
  });

  it("still reports a listing field the config declares", () => {
    const results = productComparator.compare(
      [
        {
          ...handWrittenProduct,
          channelListings: [{ channel: "main", isPublished: false, visibleInListings: true }],
        },
      ],
      [introspectedProduct],
      deployDirection
    );

    expect(results).toHaveLength(1);
    expect(results[0].changes?.[0]).toMatchObject({
      field: "channels.main",
      currentValue: { channel: "main", isPublished: true, visibleInListings: true },
      desiredValue: { channel: "main", isPublished: false, visibleInListings: true },
    });
  });
});

describe("fields the config leaves out (introspect direction)", () => {
  it("keeps comparing every field when the flag is not set", () => {
    const channelResults = channelComparator.compare([introspectedChannel], [handWrittenChannel]);
    const productResults = productComparator.compare([introspectedProduct], [handWrittenProduct]);

    expect(channelResults).toHaveLength(1);
    expect(productResults).toHaveLength(1);
  });
});
