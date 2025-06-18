import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_GIFT_CARDS = gql`
  query GetGiftCards($first: Int!) {
    giftCards(first: $first) {
      edges {
        node {
          id
          code
          displayCode
          isActive
          expiryDate
          created
          lastUsedOn
          initialBalance {
            amount
            currency
          }
          currentBalance {
            amount
            currency
          }
          tags {
            id
            name
          }
          product {
            id
            slug
          }
        }
      }
    }
  }
`;

const CREATE_GIFT_CARD = gql`
  mutation CreateGiftCard($input: GiftCardCreateInput!) {
    giftCardCreate(input: $input) {
      giftCard {
        id
        code
        displayCode
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_GIFT_CARD = gql`
  mutation UpdateGiftCard($id: ID!, $input: GiftCardUpdateInput!) {
    giftCardUpdate(id: $id, input: $input) {
      giftCard {
        id
        code
        isActive
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const ACTIVATE_GIFT_CARD = gql`
  mutation ActivateGiftCard($id: ID!) {
    giftCardActivate(id: $id) {
      giftCard {
        id
        isActive
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const DEACTIVATE_GIFT_CARD = gql`
  mutation DeactivateGiftCard($id: ID!) {
    giftCardDeactivate(id: $id) {
      giftCard {
        id
        isActive
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const ADD_GIFT_CARD_BALANCE = gql`
  mutation AddGiftCardBalance($id: ID!, $amount: PositiveDecimal!) {
    giftCardAddNote(id: $id, input: { message: "Balance adjustment" }) {
      event {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;

const BULK_CREATE_GIFT_CARDS = gql`
  mutation BulkCreateGiftCards($input: GiftCardBulkCreateInput!) {
    giftCardBulkCreate(input: $input) {
      giftCards {
        id
        code
        displayCode
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface GiftCard {
  id: string;
  code: string;
  displayCode: string;
  isActive: boolean;
  expiryDate?: string;
  created: string;
  lastUsedOn?: string;
  initialBalance: {
    amount: number;
    currency: string;
  };
  currentBalance: {
    amount: number;
    currency: string;
  };
  tags?: Array<{ id: string; name: string }>;
  product?: { id: string; slug: string };
}

export class GiftCardRepository {
  constructor(private readonly client: Client) {}

  async getGiftCards(): Promise<GiftCard[]> {
    const result = await this.client
      .query(GET_GIFT_CARDS, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch gift cards: ${result.error.message}`);
    }
    
    return result.data?.giftCards.edges.map((edge: any) => edge.node) || [];
  }

  async createGiftCard(input: any): Promise<GiftCard> {
    const result = await this.client
      .mutation(CREATE_GIFT_CARD, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create gift card: ${result.error.message}`);
    }
    
    const { giftCard, errors } = result.data?.giftCardCreate || {};
    if (errors?.length) {
      throw new Error(
        `Gift card creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return giftCard;
  }

  async updateGiftCard(id: string, input: any): Promise<GiftCard> {
    const result = await this.client
      .mutation(UPDATE_GIFT_CARD, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update gift card: ${result.error.message}`);
    }
    
    const { giftCard, errors } = result.data?.giftCardUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Gift card update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return giftCard;
  }

  async activateGiftCard(id: string): Promise<GiftCard> {
    const result = await this.client
      .mutation(ACTIVATE_GIFT_CARD, { id })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to activate gift card: ${result.error.message}`);
    }
    
    const { giftCard, errors } = result.data?.giftCardActivate || {};
    if (errors?.length) {
      throw new Error(
        `Gift card activation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return giftCard;
  }

  async deactivateGiftCard(id: string): Promise<GiftCard> {
    const result = await this.client
      .mutation(DEACTIVATE_GIFT_CARD, { id })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to deactivate gift card: ${result.error.message}`);
    }
    
    const { giftCard, errors } = result.data?.giftCardDeactivate || {};
    if (errors?.length) {
      throw new Error(
        `Gift card deactivation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return giftCard;
  }

  async bulkCreateGiftCards(input: any): Promise<GiftCard[]> {
    const result = await this.client
      .mutation(BULK_CREATE_GIFT_CARDS, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to bulk create gift cards: ${result.error.message}`);
    }
    
    const { giftCards, errors } = result.data?.giftCardBulkCreate || {};
    if (errors?.length) {
      throw new Error(
        `Bulk gift card creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return giftCards || [];
  }
} 