import { logger } from "../../lib/logger";
import type { GiftCardRepository } from "./repository";

export interface GiftCardInput {
  code?: string;
  balance: {
    amount: number;
    currency: string;
  };
  isActive?: boolean;
  expiryDate?: string;
  tags?: string[];
  note?: string;
}

export interface BulkGiftCardInput {
  count: number;
  balance: {
    amount: number;
    currency: string;
  };
  tags?: string[];
  isActive?: boolean;
  expiryDate?: string;
  prefix?: string;
}

export class GiftCardService {
  constructor(
    private readonly repository: GiftCardRepository
  ) {}

  async createGiftCards(giftCards: GiftCardInput[]) {
    logger.info(`Creating ${giftCards.length} gift cards`);
    
    const results = [];
    
    for (const giftCardInput of giftCards) {
      try {
        logger.debug(`Creating gift card with balance ${giftCardInput.balance.amount} ${giftCardInput.balance.currency}`);
        const giftCard = await this.createGiftCard(giftCardInput);
        results.push(giftCard);
      } catch (error) {
        logger.error(`Failed to create gift card`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createGiftCard(input: GiftCardInput) {
    const createInput = {
      balance: {
        amount: input.balance.amount,
        currency: input.balance.currency,
      },
      code: input.code,
      isActive: input.isActive ?? true,
      expiryDate: input.expiryDate,
      tags: input.tags,
      note: input.note || "Created via configurator",
    };
    
    return this.repository.createGiftCard(createInput);
  }

  async bulkCreateGiftCards(bulkInputs: BulkGiftCardInput[]) {
    logger.info(`Bulk creating gift cards`);
    
    const results = [];
    
    for (const bulkInput of bulkInputs) {
      try {
        logger.debug(`Bulk creating ${bulkInput.count} gift cards with balance ${bulkInput.balance.amount} ${bulkInput.balance.currency}`);
        
        const createInput = {
          count: bulkInput.count,
          balance: {
            amount: bulkInput.balance.amount,
            currency: bulkInput.balance.currency,
          },
          tags: bulkInput.tags,
          isActive: bulkInput.isActive ?? true,
          expiryDate: bulkInput.expiryDate,
          prefix: bulkInput.prefix,
        };
        
        const giftCards = await this.repository.bulkCreateGiftCards(createInput);
        results.push(...giftCards);
      } catch (error) {
        logger.error(`Failed to bulk create gift cards`, { error });
        throw error;
      }
    }
    
    return results;
  }

  async updateGiftCardStatus(code: string, isActive: boolean) {
    logger.debug(`Updating gift card status: ${code} -> ${isActive ? 'active' : 'inactive'}`);
    
    // First find the gift card by code
    const giftCards = await this.repository.getGiftCards();
    const giftCard = giftCards.find(gc => gc.code === code);
    
    if (!giftCard) {
      throw new Error(`Gift card not found: ${code}`);
    }
    
    if (isActive) {
      return this.repository.activateGiftCard(giftCard.id);
    } else {
      return this.repository.deactivateGiftCard(giftCard.id);
    }
  }

  async getGiftCards() {
    logger.debug("Fetching all gift cards");
    return this.repository.getGiftCards();
  }

  async getGiftCardByCode(code: string) {
    const giftCards = await this.getGiftCards();
    return giftCards.find(gc => gc.code === code);
  }
} 