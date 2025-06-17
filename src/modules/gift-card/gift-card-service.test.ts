import { describe, it, expect, vi, beforeEach } from "vitest";
import { GiftCardService } from "./gift-card-service";
import type { GiftCardRepository } from "./repository";

const mockRepository = {
  getGiftCards: vi.fn(),
  createGiftCard: vi.fn(),
  updateGiftCard: vi.fn(),
  activateGiftCard: vi.fn(),
  deactivateGiftCard: vi.fn(),
  bulkCreateGiftCards: vi.fn(),
} as unknown as GiftCardRepository;

describe("GiftCardService", () => {
  let service: GiftCardService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GiftCardService(mockRepository);
  });

  describe("createGiftCards", () => {
    it("should create individual gift cards", async () => {
      // Arrange
      const giftCards = [
        {
          code: "GIFT-001",
          balance: { amount: 50, currency: "USD" },
          isActive: true,
          tags: ["birthday"],
        },
        {
          balance: { amount: 100, currency: "USD" },
          expiryDate: "2025-12-31",
          tags: ["holiday"],
        },
      ];

      vi.mocked(mockRepository.createGiftCard)
        .mockResolvedValueOnce({
          id: "gc-1",
          code: "GIFT-001",
          displayCode: "GIFT-001",
          isActive: true,
          created: "2024-01-01",
          initialBalance: { amount: 50, currency: "USD" },
          currentBalance: { amount: 50, currency: "USD" },
        })
        .mockResolvedValueOnce({
          id: "gc-2",
          code: "AUTO-GENERATED",
          displayCode: "AUTO-GENERATED",
          isActive: true,
          created: "2024-01-01",
          initialBalance: { amount: 100, currency: "USD" },
          currentBalance: { amount: 100, currency: "USD" },
        });

      // Act
      const result = await service.createGiftCards(giftCards);

      // Assert
      expect(mockRepository.createGiftCard).toHaveBeenCalledTimes(2);
      expect(mockRepository.createGiftCard).toHaveBeenCalledWith({
        balance: { amount: 50, currency: "USD" },
        code: "GIFT-001",
        isActive: true,
        expiryDate: undefined,
        tags: ["birthday"],
        note: "Created via configurator",
      });
      expect(result).toHaveLength(2);
      expect(result[0].code).toBe("GIFT-001");
    });
  });

  describe("bulkCreateGiftCards", () => {
    it("should bulk create gift cards", async () => {
      // Arrange
      const bulkInputs = [
        {
          count: 10,
          balance: { amount: 25, currency: "USD" },
          tags: ["promotion"],
          prefix: "PROMO",
        },
      ];

      const mockGiftCards = Array(10).fill(null).map((_, i) => ({
        id: `gc-${i}`,
        code: `PROMO-${i}`,
        displayCode: `PROMO-${i}`,
        isActive: true,
        created: "2024-01-01",
        initialBalance: { amount: 25, currency: "USD" },
        currentBalance: { amount: 25, currency: "USD" },
      }));

      vi.mocked(mockRepository.bulkCreateGiftCards).mockResolvedValue(mockGiftCards);

      // Act
      const result = await service.bulkCreateGiftCards(bulkInputs);

      // Assert
      expect(mockRepository.bulkCreateGiftCards).toHaveBeenCalledWith({
        count: 10,
        balance: { amount: 25, currency: "USD" },
        tags: ["promotion"],
        isActive: true,
        expiryDate: undefined,
        prefix: "PROMO",
      });
      expect(result).toHaveLength(10);
    });
  });

  describe("updateGiftCardStatus", () => {
    it("should activate a gift card", async () => {
      // Arrange
      vi.mocked(mockRepository.getGiftCards).mockResolvedValue([
        {
          id: "gc-1",
          code: "GIFT-001",
          displayCode: "GIFT-001",
          isActive: false,
          created: "2024-01-01",
          initialBalance: { amount: 50, currency: "USD" },
          currentBalance: { amount: 50, currency: "USD" },
        },
      ]);

      vi.mocked(mockRepository.activateGiftCard).mockResolvedValue({
        id: "gc-1",
        code: "GIFT-001",
        displayCode: "GIFT-001",
        isActive: true,
        created: "2024-01-01",
        initialBalance: { amount: 50, currency: "USD" },
        currentBalance: { amount: 50, currency: "USD" },
      });

      // Act
      const result = await service.updateGiftCardStatus("GIFT-001", true);

      // Assert
      expect(mockRepository.activateGiftCard).toHaveBeenCalledWith("gc-1");
      expect(result.isActive).toBe(true);
    });

    it("should deactivate a gift card", async () => {
      // Arrange
      vi.mocked(mockRepository.getGiftCards).mockResolvedValue([
        {
          id: "gc-1",
          code: "GIFT-001",
          displayCode: "GIFT-001",
          isActive: true,
          created: "2024-01-01",
          initialBalance: { amount: 50, currency: "USD" },
          currentBalance: { amount: 50, currency: "USD" },
        },
      ]);

      vi.mocked(mockRepository.deactivateGiftCard).mockResolvedValue({
        id: "gc-1",
        code: "GIFT-001",
        displayCode: "GIFT-001",
        isActive: false,
        created: "2024-01-01",
        initialBalance: { amount: 50, currency: "USD" },
        currentBalance: { amount: 50, currency: "USD" },
      });

      // Act
      const result = await service.updateGiftCardStatus("GIFT-001", false);

      // Assert
      expect(mockRepository.deactivateGiftCard).toHaveBeenCalledWith("gc-1");
      expect(result.isActive).toBe(false);
    });

    it("should throw error if gift card not found", async () => {
      // Arrange
      vi.mocked(mockRepository.getGiftCards).mockResolvedValue([]);

      // Act & Assert
      await expect(
        service.updateGiftCardStatus("NONEXISTENT", true)
      ).rejects.toThrow("Gift card not found: NONEXISTENT");
    });
  });
}); 