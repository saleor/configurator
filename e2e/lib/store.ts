import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inject } from "vitest";
import { parse, stringify } from "yaml";
import { CHECKOUT_CLI, saleorCli } from "./cli";
import { gql } from "./saleor";

type ConfigFile = Record<string, unknown>;

const RUN_ID = Date.now().toString(36);

/**
 * A prefix for one test file's objects, unique per run, so a store reused across runs
 * (`E2E_SALEOR_URL`) never holds an earlier run's objects under the same names.
 */
export const runPrefix = (name: string) => `${name}-${RUN_ID}`;

/** A temporary directory for one test file: configs, reports and the CLI's cwd. */
export function workspace(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `configurator-e2e-${name}-`));
}

export const readConfig = (file: string): ConfigFile => parse(fs.readFileSync(file, "utf8"));
export const writeConfig = (file: string, config: ConfigFile) =>
  fs.writeFileSync(file, stringify(config));

/** Reads Saleor as the app the CLI uses. */
export const readSaleor = <T>(query: string, variables: Record<string, unknown> = {}) => {
  const { apiUrl, token } = inject("saleor");
  return gql<T>(apiUrl, query, variables, token);
};

/**
 * A small store slice: one of each entity a typical store config holds. Every name and slug
 * carries the prefix, so test files share the store without colliding.
 */
export function seedSlice(prefix: string) {
  const p = prefix;
  return {
    channels: [
      {
        name: `${p} Channel`,
        slug: `${p}-channel`,
        currencyCode: "USD",
        defaultCountry: "US",
        isActive: false,
      },
    ],
    warehouses: [
      {
        name: `${p} Warehouse`,
        slug: `${p}-warehouse`,
        email: "warehouse@example.com",
        isPrivate: true,
        clickAndCollectOption: "DISABLED",
        address: {
          streetAddress1: "1 Test Street",
          city: "NEW YORK",
          postalCode: "10001",
          country: "US",
          countryArea: "NY",
        },
      },
    ],
    productAttributes: [
      {
        name: `${p} Color`,
        inputType: "DROPDOWN",
        values: [{ name: `${p} Red` }, { name: `${p} Blue` }],
      },
    ],
    productTypes: [
      {
        name: `${p} Shirt`,
        isShippingRequired: true,
        productAttributes: [{ attribute: `${p} Color` }],
      },
    ],
    categories: [
      {
        name: `${p} Apparel`,
        slug: `${p}-apparel`,
        subcategories: [{ name: `${p} Shirts`, slug: `${p}-shirts` }],
      },
    ],
    products: [
      {
        name: `${p} Tee`,
        slug: `${p}-tee`,
        description: "Seeded tee",
        productType: `${p} Shirt`,
        category: `${p}-shirts`,
        attributes: { [`${p} Color`]: `${p} Red` },
        media: [{ externalUrl: `${inject("mediaBaseUrl")}/tee.png`, alt: `${p} tee` }],
        channelListings: [
          {
            channel: `${p}-channel`,
            isPublished: true,
            visibleInListings: true,
            isAvailableForPurchase: true,
          },
        ],
        variants: [
          {
            name: `${p} Tee M`,
            sku: `${p.toUpperCase()}-TEE-M`,
            attributes: {},
            channelListings: [{ channel: `${p}-channel`, price: 19.99 }],
          },
        ],
      },
    ],
    collections: [
      {
        name: `${p} Featured`,
        slug: `${p}-featured`,
        products: [`${p}-tee`],
        channelListings: [{ channelSlug: `${p}-channel`, isPublished: true }],
      },
    ],
  };
}

export type SeedSlice = ReturnType<typeof seedSlice>;

/** Appends each section of the slice to the same section of an introspected config. */
function addSlice(config: ConfigFile, slice: SeedSlice): ConfigFile {
  const merged: ConfigFile = { ...config };
  for (const [section, entries] of Object.entries(slice)) {
    const existing = Array.isArray(config[section]) ? (config[section] as unknown[]) : [];
    merged[section] = [...existing, ...entries];
  }
  return merged;
}

/**
 * Seeds the slice the way a user starts: introspect the store, add to the file, deploy.
 * Returns the seeded config path and the first deploy's envelope.
 */
export function seedStore(dir: string, prefix: string, bin = CHECKOUT_CLI) {
  const cli = saleorCli(inject("saleor"), dir, bin);
  const basePath = path.join(dir, "base.yml");
  const seedPath = path.join(dir, "seed.yml");

  const introspect = cli.introspect(basePath);
  if (introspect.exitCode !== 0) {
    throw new Error(`Introspecting the store failed: ${JSON.stringify(introspect)}`);
  }
  writeConfig(seedPath, addSlice(readConfig(basePath), seedSlice(prefix)));
  return { seedPath, firstDeploy: cli.deploy(seedPath) };
}
