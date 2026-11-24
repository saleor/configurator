import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";
import { type DeployResult, type Envelope, saleorCli } from "./lib/cli";
import {
  readSaleor,
  runPrefix,
  type SeedSlice,
  seedSlice,
  seedStore,
  workspace,
} from "./lib/store";

const PREFIX = runPrefix("lifecycle");

interface StoreRead {
  channel: {
    name: string;
    isActive: boolean;
    currencyCode: string;
    defaultCountry: { code: string };
  };
  warehouse: {
    name: string;
    email: string;
    isPrivate: boolean;
    clickAndCollectOption: string;
    address: {
      streetAddress1: string;
      city: string;
      postalCode: string;
      country: { code: string };
      countryArea: string;
    };
  };
  attributes: {
    edges: {
      node: { name: string; inputType: string; choices: { edges: { node: { name: string } }[] } };
    }[];
  };
  productTypes: {
    edges: {
      node: { name: string; isShippingRequired: boolean; productAttributes: { name: string }[] };
    }[];
  };
  parent: { name: string; children: { edges: { node: { slug: string; name: string } }[] } };
  product: {
    name: string;
    productType: { name: string };
    category: { slug: string };
    attributes: { attribute: { name: string }; values: { name: string }[] }[];
    media: { alt: string; metadata: { key: string; value: string }[] }[];
    channelListings: {
      channel: { slug: string };
      isPublished: boolean;
      visibleInListings: boolean;
      isAvailableForPurchase: boolean;
    }[];
    variants: {
      name: string;
      sku: string;
      channelListings: { channel: { slug: string }; price: { amount: number } }[];
    }[];
  };
  collection: {
    name: string;
    products: { edges: { node: { slug: string } }[] };
    channelListings: { channel: { slug: string }; isPublished: boolean }[];
  };
}

const READ_STORE = `
  query($p: String!, $channel: String!, $warehouse: String!, $category: String!, $product: String!, $collection: String!) {
    channel(slug: $channel) { name isActive currencyCode defaultCountry { code } }
    warehouse: warehouses(first: 1, filter: { slugs: [$warehouse] }) {
      edges { node { name email isPrivate clickAndCollectOption
        address { streetAddress1 city postalCode country { code } countryArea } } }
    }
    attributes(first: 5, filter: { search: $p }) {
      edges { node { name inputType choices(first: 10) { edges { node { name } } } } }
    }
    productTypes(first: 5, filter: { search: $p }) {
      edges { node { name isShippingRequired productAttributes { name } } }
    }
    parent: category(slug: $category) { name children(first: 10) { edges { node { slug name } } } }
    product(slug: $product, channel: $channel) {
      name productType { name } category { slug }
      attributes { attribute { name } values { name } }
      media { alt metadata { key value } }
      channelListings { channel { slug } isPublished visibleInListings isAvailableForPurchase }
      variants { name sku channelListings { channel { slug } price { amount } } }
    }
    collection(slug: $collection, channel: $channel) {
      name products(first: 10) { edges { node { slug } } }
      channelListings { channel { slug } isPublished }
    }
  }
`;

async function readSeededStore(slice: SeedSlice) {
  const data = await readSaleor<
    Omit<StoreRead, "warehouse"> & { warehouse: { edges: { node: StoreRead["warehouse"] }[] } }
  >(READ_STORE, {
    p: PREFIX,
    channel: slice.channels[0].slug,
    warehouse: slice.warehouses[0].slug,
    category: slice.categories[0].slug,
    product: slice.products[0].slug,
    collection: slice.collections[0].slug,
  });
  return { ...data, warehouse: data.warehouse.edges[0]?.node };
}

describe("deploying a store slice to an empty Saleor", () => {
  const slice = seedSlice(PREFIX);
  const [channel] = slice.channels;
  const [warehouse] = slice.warehouses;
  const [attribute] = slice.productAttributes;
  const [productType] = slice.productTypes;
  const [category] = slice.categories;
  const [product] = slice.products;
  const [variant] = product.variants;
  const [collection] = slice.collections;

  let dir: string;
  let seedPath: string;
  let firstDeploy: Envelope<DeployResult>;
  let store: StoreRead;

  beforeAll(async () => {
    dir = workspace("lifecycle");
    ({ seedPath, firstDeploy } = seedStore(dir, PREFIX));
    store = await readSeededStore(slice);
  });

  it("reports a successful first deploy", () => {
    expect(firstDeploy.exitCode).toBe(0);
    expect(firstDeploy.result.status).toBe("success");
    expect(firstDeploy.errors).toEqual([]);
  });

  it("creates the channel as configured", () => {
    expect(store.channel).toEqual({
      name: channel.name,
      isActive: channel.isActive,
      currencyCode: channel.currencyCode,
      defaultCountry: { code: channel.defaultCountry },
    });
  });

  it("creates the warehouse as configured", () => {
    const { address } = warehouse;
    expect(store.warehouse).toEqual({
      name: warehouse.name,
      email: warehouse.email,
      isPrivate: warehouse.isPrivate,
      clickAndCollectOption: warehouse.clickAndCollectOption,
      address: { ...address, country: { code: address.country } },
    });
  });

  it("creates the attribute with its values and the product type using it", () => {
    expect(store.attributes.edges.map(({ node }) => node)).toEqual([
      {
        name: attribute.name,
        inputType: attribute.inputType,
        choices: { edges: attribute.values.map((value) => ({ node: { name: value.name } })) },
      },
    ]);
    expect(store.productTypes.edges.map(({ node }) => node)).toEqual([
      {
        name: productType.name,
        isShippingRequired: productType.isShippingRequired,
        productAttributes: [{ name: attribute.name }],
      },
    ]);
  });

  it("creates the category with its subcategory", () => {
    expect(store.parent).toEqual({
      name: category.name,
      children: {
        edges: category.subcategories.map((sub) => ({ node: { slug: sub.slug, name: sub.name } })),
      },
    });
  });

  it("creates the product with its attribute, media, listing and variant", () => {
    const [listing] = product.channelListings;
    expect(store.product).toMatchObject({
      name: product.name,
      productType: { name: productType.name },
      category: { slug: product.category },
      attributes: [
        { attribute: { name: attribute.name }, values: [{ name: attribute.values[0].name }] },
      ],
      media: [{ alt: product.media[0].alt }],
      channelListings: [
        {
          channel: { slug: listing.channel },
          isPublished: listing.isPublished,
          visibleInListings: listing.visibleInListings,
          isAvailableForPurchase: listing.isAvailableForPurchase,
        },
      ],
      variants: [
        {
          name: variant.name,
          sku: variant.sku,
          channelListings: [
            {
              channel: { slug: channel.slug },
              price: { amount: variant.channelListings[0].price },
            },
          ],
        },
      ],
    });
  });

  it("creates the collection with its channel listing", () => {
    expect(store.collection).toMatchObject({
      name: collection.name,
      channelListings: [{ channel: { slug: channel.slug }, isPublished: true }],
    });
  });

  const collectionProducts = (read: StoreRead) =>
    read.collection.products.edges.map(({ node }) => node.slug);
  const mediaSource = {
    key: "configurator.externalUrl",
    value: product.media[0].externalUrl,
  };

  // Known bug: the first deploy creates the collection before its products exist and skips them
  // ("Product with slug ... not found, skipping"). A second deploy assigns them.
  it.fails("assigns the collection's products on the first deploy", () => {
    expect(collectionProducts(store)).toEqual(collection.products);
  });

  it("stores each media item's source URL on the first deploy", () => {
    expect(store.product.media[0].metadata).toContainEqual(mediaSource);
  });

  describe("deploying the same config again", () => {
    let second: Envelope<DeployResult>;
    let afterSecond: StoreRead;

    beforeAll(async () => {
      second = saleorCli(inject("saleor"), dir).deploy(seedPath);
      afterSecond = await readSeededStore(slice);
    });

    it("succeeds", () => {
      expect(second.exitCode).toBe(0);
    });

    it("assigns the collection's products", () => {
      expect(collectionProducts(afterSecond)).toEqual(collection.products);
    });

    it("stores each media item's source URL", () => {
      expect(afterSecond.product.media[0].metadata).toContainEqual(mediaSource);
    });

    it("reports no changes when deployed a third time", () => {
      const third = saleorCli(inject("saleor"), dir).deploy(seedPath);
      expect(third.exitCode).toBe(0);
      expect(third.result.status).toBe("no-changes");
    });
  });

  describe("round trip", () => {
    const introspectedPath = () => path.join(dir, "introspected.yml");

    beforeAll(() => {
      const introspect = saleorCli(inject("saleor"), dir).introspect(introspectedPath());
      expect(introspect.exitCode).toBe(0);
    });

    it("diffs an introspected file against the store with no changes", () => {
      const diff = saleorCli(inject("saleor"), dir).diff(introspectedPath());
      expect(diff.exitCode).toBe(0);
      expect(diff.result.summary.totalChanges).toBe(0);
    });

    it("deploys an introspected file with no changes", () => {
      const deploy = saleorCli(inject("saleor"), dir).deploy(introspectedPath());
      expect(deploy.exitCode).toBe(0);
      expect(deploy.result.status).toBe("no-changes");
    });
  });
});
