import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { CommandConfig, CommandHandler } from "../cli/command";
import { Console } from "../cli/console";
import { ensureTsConfigPath } from "../modules/config/utils";

const initCommandSchema = z.object({
  dir: z.string().default("config").describe("Directory for the generated configuration"),
  force: z.boolean().default(false).describe("Overwrite existing files"),
  layout: z
    .enum(["single", "sections"])
    .default("sections")
    .describe("Layout of the generated stack"),
  quiet: z.boolean().default(false).describe("Suppress output"),
});

export type InitCommandArgs = z.infer<typeof initCommandSchema>;

const SECTIONS_DIR = "sections";

const STACK_TEMPLATE = (layout: "single" | "sections") => `import { defineStack } from "@saleor/configurator/dsl";
import { env } from "./env";
${layout === "sections" ? `import { configureShop } from "./${SECTIONS_DIR}/shop";
import { registerChannels } from "./${SECTIONS_DIR}/channels";
import { buildCatalog } from "./${SECTIONS_DIR}/catalog";
import { setupFulfillment } from "./${SECTIONS_DIR}/fulfillment";
import { publishContent } from "./${SECTIONS_DIR}/content";
` : ""}
export default defineStack(env.stackName, () => {
  env.configureShop();
${layout === "sections" ? "  configureShop();\n  registerChannels();\n  buildCatalog();\n  setupFulfillment();\n  publishContent();\n" : ""}
});
`;

const ENV_TEMPLATE = `import { Shop } from "@saleor/configurator/dsl";
import type { ShopProps, CurrencyCode, CountryCode } from "@saleor/configurator/dsl/types";

interface Market {
  readonly name: string;
  readonly slug: string;
  readonly currencyCode: CurrencyCode;
  readonly defaultCountry: CountryCode;
}

const shopDefaults: ShopProps = {
  defaultMailSenderName: "Saleor Store",
  defaultMailSenderAddress: "store@example.com",
  displayGrossPrices: true,
  enableAccountConfirmationByEmail: true,
  trackInventoryByDefault: true,
  limitQuantityPerCheckout: 10,
  reserveStockDurationAnonymousUser: 5,
  reserveStockDurationAuthenticatedUser: 10,
  defaultDigitalMaxDownloads: 5,
  defaultDigitalUrlValidDays: 30,
  defaultWeightUnit: "KG",
};

export const env = {
  stackName: process.env.SALEOR_STACK ?? "dev",
  markets: [] as Market[],
  configureShop(): void {
    new Shop(shopDefaults);
  },
};
`;

const CHANNEL_TEMPLATE = `import { Channel } from "@saleor/configurator/dsl";
import type { ChannelProps } from "@saleor/configurator/dsl/types";

const channels: ChannelProps[] = [
  {
    name: "Online Store",
    slug: "online",
    currencyCode: "USD",
    defaultCountry: "US",
    isActive: true,
    settings: {
      allocationStrategy: "PRIORITIZE_SORTING_ORDER",
      automaticallyConfirmAllNewOrders: true,
      automaticallyFulfillNonShippableGiftCard: true,
      expireOrdersAfter: 30,
      deleteExpiredOrdersAfter: 60,
      markAsPaidStrategy: "TRANSACTION_FLOW",
      allowUnpaidOrders: false,
      automaticallyCompleteFullyPaidCheckouts: true,
      defaultTransactionFlowStrategy: "AUTHORIZATION",
      includeDraftOrderInVoucherUsage: true,
      useLegacyErrorFlow: false,
    },
  },
];

export function registerChannels(): void {
  channels.forEach((channel) => {
    const identifier = channel.slug ?? channel.name;
    new Channel(identifier, channel);
  });
}
`;

const SHOP_TEMPLATE = `import { Shop } from "@saleor/configurator/dsl";
import type { ShopProps } from "@saleor/configurator/dsl/types";

const shop: ShopProps = {
  defaultMailSenderName: "Saleor Store",
  defaultMailSenderAddress: "store@example.com",
  displayGrossPrices: true,
  enableAccountConfirmationByEmail: true,
  trackInventoryByDefault: true,
  limitQuantityPerCheckout: 10,
  reserveStockDurationAnonymousUser: 5,
  reserveStockDurationAuthenticatedUser: 10,
  defaultDigitalMaxDownloads: 5,
  defaultDigitalUrlValidDays: 30,
  defaultWeightUnit: "KG",
};

export function configureShop(): void {
  new Shop(shop);
}
`;

const CATALOG_TEMPLATE = `import { Attribute, ProductType } from "@saleor/configurator/dsl";
import type { AttributeProps, ProductTypeProps } from "@saleor/configurator/dsl/types";

const attributes: AttributeProps[] = [
  {
    name: "Author",
    inputType: "PLAIN_TEXT",
    type: "PRODUCT_TYPE",
  },
];

const productTypes: ProductTypeProps[] = [
  {
    name: "Book",
    isShippingRequired: true,
    productAttributes: [attributes[0]],
  },
];

export function buildCatalog(): void {
  attributes.forEach((attribute) => new Attribute(attribute.name, attribute));
  productTypes.forEach((productType) => new ProductType(productType.name, productType));
}
`;

const FULFILLMENT_TEMPLATE = `import { Warehouse, ShippingZone } from "@saleor/configurator/dsl";
import type { ShippingZoneProps, WarehouseProps } from "@saleor/configurator/dsl/types";

const warehouses: WarehouseProps[] = [
  {
    name: "Main Warehouse",
    slug: "main-warehouse",
    email: "warehouse@example.com",
    isPrivate: false,
    clickAndCollectOption: "DISABLED",
    address: {
      city: "San Francisco",
      country: "US",
      countryArea: "CA",
      postalCode: "94105",
      streetAddress1: "Market Street",
    },
  },
];

const shippingZones: ShippingZoneProps[] = [
  {
    name: "United States",
    default: false,
    countries: ["US"],
    shippingMethods: [],
  },
];

export function setupFulfillment(): void {
  warehouses.forEach((warehouse) => new Warehouse(warehouse.name, warehouse));
  shippingZones.forEach((zone) => new ShippingZone(zone.name, zone));
}
`;

const CONTENT_TEMPLATE = `import { PageType } from "@saleor/configurator/dsl";
import type { PageTypeProps } from "@saleor/configurator/dsl/types";

const pageTypes: PageTypeProps[] = [
  {
    name: "Blog Post",
    attributes: [],
  },
];

export function publishContent(): void {
  pageTypes.forEach((pageType) => new PageType(pageType.name, pageType));
}
`;

const TEST_TEMPLATE = `import { describe, expect, it } from "vitest";
import { buildCommandConfig } from "@saleor/configurator/commands/build";

describe("configuration", () => {
  it("builds successfully", async () => {
    await expect(
      buildCommandConfig.handler({
        config: "config/stack.ts",
        out: undefined,
        pretty: false,
        quiet: true,
        watch: false,
      })
    ).resolves.toBeUndefined();
  });
});
`;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfAllowed(target: string, content: string, force: boolean): Promise<void> {
  const exists = await pathExists(target);
  if (exists && !force) {
    throw new Error(`File ${target} already exists. Use --force to overwrite.`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf-8");
}

class InitCommandHandler implements CommandHandler<InitCommandArgs, void> {
  console = new Console();

  async execute(args: InitCommandArgs): Promise<void> {
    this.console.setOptions({ quiet: args.quiet });

    const targetDir = path.resolve(args.dir);
    const stackPath = ensureTsConfigPath(path.join(targetDir, "stack.ts"));

    const templates: Array<[string, string]> = [
      ["env.ts", ENV_TEMPLATE],
      ["stack.ts", STACK_TEMPLATE(args.layout)],
    ];

    if (args.layout === "sections") {
      templates.push([
        path.join(SECTIONS_DIR, "shop.ts"),
        SHOP_TEMPLATE,
      ]);
      templates.push([
        path.join(SECTIONS_DIR, "channels.ts"),
        CHANNEL_TEMPLATE,
      ]);
      templates.push([
        path.join(SECTIONS_DIR, "catalog.ts"),
        CATALOG_TEMPLATE,
      ]);
      templates.push([
        path.join(SECTIONS_DIR, "fulfillment.ts"),
        FULFILLMENT_TEMPLATE,
      ]);
      templates.push([
        path.join(SECTIONS_DIR, "content.ts"),
        CONTENT_TEMPLATE,
      ]);
    }

    templates.push([
      path.join("__tests__", "config.spec.ts"),
      TEST_TEMPLATE,
    ]);

    for (const [relativePath, content] of templates) {
      const absolutePath = path.join(targetDir, relativePath);
      await writeFileIfAllowed(absolutePath, content, args.force);
    }

    this.console.success(`✨ TypeScript configuration scaffolded at ${stackPath}`);
  }
}

export const initCommandConfig: CommandConfig<typeof initCommandSchema> = {
  name: "init",
  description: "Create a starter TypeScript configuration stack",
  schema: initCommandSchema,
  handler: async (args) => {
    const handler = new InitCommandHandler();
    await handler.execute(args);
  },
  requiresInteractive: false,
  examples: [
    "configurator init --dir config",
    "configurator init --dir config --layout sections --force",
  ],
};
