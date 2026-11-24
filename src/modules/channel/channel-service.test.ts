import { describe, expect, it, vi } from "vitest";
import { ChannelService } from "./channel-service";

describe("ChannelService", () => {
  describe("is idempotent", () => {
    it("should not create a channel that already exists", async () => {
      const existingChannel = {
        name: "Channel 1",
        slug: "channel-1",
        currencyCode: "USD" as const,
        defaultCountry: "US" as const,
        isActive: false,
      };

      const mockOperations = {
        getChannels: vi.fn().mockResolvedValue([existingChannel]),
        getChannelBySlug: vi.fn(),
        createChannel: vi.fn(),
        updateChannel: vi.fn(),
      };

      const service = new ChannelService(mockOperations);

      // When
      await service.bootstrapChannels([existingChannel]);

      // Then
      expect(mockOperations.createChannel).not.toHaveBeenCalled();
    });
  });

  describe("existing channels", () => {
    const remoteChannel = {
      id: "channel-id",
      name: "Old Name",
      slug: "channel-1",
      currencyCode: "USD",
      defaultCountry: { code: "US" },
      isActive: true,
    };

    const createOperations = () => ({
      getChannels: vi.fn().mockResolvedValue([remoteChannel]),
      getChannelBySlug: vi.fn(),
      createChannel: vi.fn(),
      updateChannel: vi.fn().mockResolvedValue({ ...remoteChannel, name: "New Name" }),
    });

    it("applies changes to a channel configured without settings", async () => {
      const operations = createOperations();
      const service = new ChannelService(operations);

      await service.bootstrapChannels([
        {
          name: "New Name",
          slug: "channel-1",
          currencyCode: "USD",
          defaultCountry: "PL",
          isActive: true,
        },
      ]);

      expect(operations.createChannel).not.toHaveBeenCalled();
      expect(operations.updateChannel).toHaveBeenCalledWith("channel-id", {
        name: "New Name",
        slug: "channel-1",
        isActive: true,
        defaultCountry: "PL",
      });
    });
  });
});
