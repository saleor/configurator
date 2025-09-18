import { describe, expect, it } from "vitest";
import { defineStack } from "..";
import {
  createMarketChannel,
  registerAttributes,
  registerPageTypes,
  registerProductTypes,
  registerProducts,
  registerShippingZones,
  registerWarehouses,
} from "./index";
import type {
  AttributeProps,
  PageTypeProps,
  ProductProps,
  ProductTypeProps,
  ShippingZoneProps,
  WarehouseProps,
} from "../types";

describe("DSL components", () => {
  it("registers attributes and product types", async () => {
    const stack = defineStack("test", () => {
      registerAttributes([
        {
          name: "Author",
          inputType: "PLAIN_TEXT",
          type: "PRODUCT_TYPE",
        } as AttributeProps,
      ]);
      registerProductTypes([
        {
          name: "Book",
          isShippingRequired: true,
          productAttributes: [
            {
              name: "Author",
              inputType: "PLAIN_TEXT",
              type: "PRODUCT_TYPE",
            } as AttributeProps,
          ],
        } as ProductTypeProps,
      ]);
    });

    const config = await stack.build();

    expect(config.attributes?.[0]?.name).toBe("Author");
    expect(config.productTypes?.[0]?.name).toBe("Book");
  });

  it("creates a market channel with defaults", async () => {
    const stack = defineStack("test", () => {
      createMarketChannel({
        name: "Online",
        slug: "online",
        currencyCode: "USD",
        defaultCountry: "US",
        settings: {
          allocationStrategy: "PRIORITIZE_SORTING_ORDER",
        },
      });
    });

    const config = await stack.build();
    expect(config.channels?.[0]?.slug).toBe("online");
  });

  it("registers catalog, fulfillment, and content helpers", async () => {
    const products: ProductProps[] = [
      ({
        name: "Sneaker",
        slug: "sneaker",
        productType: "Footwear",
        category: "footwear",
        attributes: {},
        channelListings: [
          {
            channel: "online",
            isPublished: true,
            visibleInListings: true,
          },
        ],
        variants: [
          {
            name: "Default",
            sku: "SN-001",
            attributes: {},
            channelListings: [
              {
                channel: "online",
                price: 99,
              },
            ],
          },
        ],
      } as unknown) as ProductProps,
    ];

    const warehouses: WarehouseProps[] = [
      {
        name: "Main",
        slug: "main",
        email: "warehouse@example.com",
        isPrivate: false,
        clickAndCollectOption: "DISABLED",
        address: {
          city: "Berlin",
          country: "DE",
          postalCode: "10000",
          streetAddress1: "Alexanderplatz 1",
        },
      } as WarehouseProps,
    ];

    const shippingZones: ShippingZoneProps[] = [
      ({
        name: "EU",
        default: false,
        countries: ["DE"],
        shippingMethods: [],
      } as unknown) as ShippingZoneProps,
    ];

    const pageTypes: PageTypeProps[] = [
      {
        name: "Landing Page",
        attributes: [],
      } as PageTypeProps,
    ];

    const stack = defineStack("test", () => {
      registerProducts(products);
      registerWarehouses(warehouses);
      registerShippingZones(shippingZones);
      registerPageTypes(pageTypes);
    });

    const config = await stack.build();
    expect(config.products?.[0]?.slug).toBe("sneaker");
    expect(config.warehouses?.[0]?.slug).toBe("main");
    expect(config.shippingZones?.[0]?.name).toBe("EU");
    expect(config.pageTypes?.[0]?.name).toBe("Landing Page");
  });
});
