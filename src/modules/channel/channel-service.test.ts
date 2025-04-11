import { describe, expect, it, vi } from "vitest";
import { ChannelService } from "./channel-service";

describe("ChannelService", () => {
  describe("is idempotent", () => {
    it("should not create a channel that already exists", async () => {
      const existingChannel = {
        name: "Channel 1",
        slug: "channel-1",
        currencyCode: "USD",
        defaultCountry: "US" as const,
      };

      const mockOperations = {
        getChannels: vi.fn().mockResolvedValue([existingChannel]),
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
});
