import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { convertCommandConfig, type ConvertCommandArgs } from "./convert";

async function createTempConfigDirectory(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "configurator-convert-"));
}

describe("convert command", () => {
  it("converts YAML configuration into TypeScript", async () => {
    const workdir = await createTempConfigDirectory();
    const yamlPath = path.join(workdir, "config.yml");
    const tsPath = path.join(workdir, "stack.ts");

    await writeFile(
      yamlPath,
      `shop:
  defaultMailSenderName: "Test"
  defaultMailSenderAddress: "test@example.com"
  displayGrossPrices: true
  enableAccountConfirmationByEmail: true
  trackInventoryByDefault: true
  limitQuantityPerCheckout: 10
  reserveStockDurationAnonymousUser: 5
  reserveStockDurationAuthenticatedUser: 10
  defaultDigitalMaxDownloads: 5
  defaultDigitalUrlValidDays: 30
  defaultWeightUnit: KG
channels:
  - name: Online
    slug: online
    currencyCode: USD
    defaultCountry: US
    isActive: true
    settings:
      allocationStrategy: PRIORITIZE_SORTING_ORDER
      automaticallyConfirmAllNewOrders: true
      automaticallyFulfillNonShippableGiftCard: true
      expireOrdersAfter: 30
      deleteExpiredOrdersAfter: 60
      markAsPaidStrategy: TRANSACTION_FLOW
      allowUnpaidOrders: false
      automaticallyCompleteFullyPaidCheckouts: true
      defaultTransactionFlowStrategy: AUTHORIZATION
      includeDraftOrderInVoucherUsage: true
      useLegacyErrorFlow: false
`,
      "utf-8"
    );

    const args: ConvertCommandArgs = {
      from: yamlPath,
      to: tsPath,
      layout: "sections",
      overwrite: true,
    };

    await convertCommandConfig.handler(args);

    const root = await readFile(tsPath, "utf-8");
    expect(root).toContain("defineStack");
    const channels = await readFile(path.join(workdir, "sections", "channels.ts"), "utf-8");
    expect(channels).toContain("registerChannels");

    await rm(workdir, { recursive: true, force: true });
  });
});
