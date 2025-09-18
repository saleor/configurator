import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TypeScriptConfigurationManager } from "./ts-manager";
import type { SaleorConfig } from "./schema/schema";

const CHANNEL_SOURCE = `new Channel("poland", {
  name: "Poland",
  currencyCode: "PLN",
  defaultCountry: "PL",
  slug: "poland",
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
    useLegacyErrorFlow: false
  }
});`;

describe("TypeScriptConfigurationManager", () => {
  async function createTempDir(): Promise<string> {
    return mkdtemp(path.join(tmpdir(), "configurator-ts-manager-"));
  }

  it("loads configuration defined through the DSL", async () => {
    const dir = await createTempDir();
    const configPath = path.join(dir, "config.ts");
    const source = `import { defineStack, Channel, ProductType } from "@saleor/configurator/dsl";

export default defineStack("test", () => {
  ${CHANNEL_SOURCE}

  new ProductType("book", {
    name: "Book",
    isShippingRequired: true,
    productAttributes: [
      { name: "Author", inputType: "PLAIN_TEXT" }
    ]
  });
});
`;

    await writeFile(configPath, source, "utf-8");

    try {
      const manager = new TypeScriptConfigurationManager(configPath);
      const config = await manager.load();

      expect(config.channels).toBeDefined();
      expect(config.channels?.[0]?.slug).toBe("poland");
      const attribute = config.productTypes?.[0]?.productAttributes?.[0] as
        | { name?: string }
        | undefined;
      expect(attribute?.name).toBe("Author");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("saves configuration using the DSL format", async () => {
    const dir = await createTempDir();
    const configPath = path.join(dir, "config.ts");
    const manager = new TypeScriptConfigurationManager(configPath);

    const config: SaleorConfig = {
      channels: [
        {
          name: "Poland",
          currencyCode: "PLN",
          defaultCountry: "PL",
          slug: "poland",
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
      ],
    };

    try {
      await manager.save(config);

      const contents = await readFile(configPath, "utf-8");
      expect(contents).toContain("defineStack");
      expect(contents).toContain("new Channel");
      expect(contents).toContain("Poland");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("saves configuration using split modules layout", async () => {
    const dir = await createTempDir();
    const configPath = path.join(dir, "stack.ts");
    const sectionsDir = path.join(dir, "sections");
    const manager = new TypeScriptConfigurationManager(configPath, {
      layout: "split-sections",
      baseDir: sectionsDir,
    });

    const config: SaleorConfig = {
      shop: {
        defaultMailSenderName: "Saleor",
        defaultMailSenderAddress: "hello@example.com",
        displayGrossPrices: true,
        enableAccountConfirmationByEmail: true,
        trackInventoryByDefault: true,
        limitQuantityPerCheckout: 10,
        reserveStockDurationAnonymousUser: 5,
        reserveStockDurationAuthenticatedUser: 10,
        defaultDigitalMaxDownloads: 5,
        defaultDigitalUrlValidDays: 30,
        defaultWeightUnit: "KG",
      },
      channels: [
        {
          name: "Main",
          slug: "main",
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
      ],
    };

    try {
      await manager.save(config);

      const root = await readFile(configPath, "utf-8");
      expect(root).toContain("registerChannels");

      const channelModule = await readFile(path.join(sectionsDir, "channels.ts"), "utf-8");
      expect(channelModule).toContain("Channel");
      expect(channelModule).toContain("registerChannels");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
