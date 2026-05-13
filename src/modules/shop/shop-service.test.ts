import { describe, expect, it, vi } from "vitest";
import { ShopService } from "./shop-service";

describe("ShopService", () => {
  it("should strip legacy digital settings before updating shop settings", async () => {
    const repository = {
      updateShopSettings: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ShopService(repository);

    await service.updateSettings({
      defaultMailSenderName: "Test Shop",
      automaticFulfillmentDigitalProducts: true,
      defaultDigitalMaxDownloads: 5,
      defaultDigitalUrlValidDays: 14,
    });

    expect(repository.updateShopSettings).toHaveBeenCalledWith({
      defaultMailSenderName: "Test Shop",
    });
  });

  it("should skip the update when only legacy digital settings are provided", async () => {
    const repository = {
      updateShopSettings: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ShopService(repository);

    await service.updateSettings({
      automaticFulfillmentDigitalProducts: true,
      defaultDigitalMaxDownloads: 5,
      defaultDigitalUrlValidDays: 14,
    });

    expect(repository.updateShopSettings).not.toHaveBeenCalled();
  });
});
