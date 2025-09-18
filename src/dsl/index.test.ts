import { describe, expect, it } from "vitest";
import { defineStack, Channel } from "./index";

describe("DSL runtime", () => {
  it("prevents duplicate resource identifiers", async () => {
    const stack = defineStack("test", () => {
      new Channel("primary", {
        name: "Primary",
        slug: "primary",
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
      });

      new Channel("primary", {
        name: "Primary",
        slug: "primary",
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
      });
    });

    await expect(stack.build()).rejects.toThrow(/Duplicate identifier/);
  });

  it("blocks non-deterministic random usage", async () => {
    const stack = defineStack("test", () => {
      Math.random();
    });

    await expect(stack.build()).rejects.toThrow(/Non-deterministic Math.random/);
  });
});
