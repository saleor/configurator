import type { Client } from "@urql/core";
import { gql } from "@urql/core";

const GET_VOUCHERS = gql`
  query GetVouchers($first: Int!) {
    vouchers(first: $first) {
      edges {
        node {
          id
          name
          code
          type
          discountValueType
          usageLimit
          used
          startDate
          endDate
          applyOncePerOrder
          applyOncePerCustomer
          onlyForStaff
          minCheckoutItemsQuantity
          categories(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          collections(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          products(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          channelListings {
            channel {
              id
              slug
            }
            discountValue
            minSpent {
              amount
            }
          }
        }
      }
    }
  }
`;

const CREATE_VOUCHER = gql`
  mutation CreateVoucher($input: VoucherInput!) {
    voucherCreate(input: $input) {
      voucher {
        id
        name
        code
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_VOUCHER = gql`
  mutation UpdateVoucher($id: ID!, $input: VoucherInput!) {
    voucherUpdate(id: $id, input: $input) {
      voucher {
        id
        name
        code
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const VOUCHER_CHANNEL_LISTING_UPDATE = gql`
  mutation VoucherChannelListingUpdate($id: ID!, $input: VoucherChannelListingInput!) {
    voucherChannelListingUpdate(id: $id, input: $input) {
      voucher {
        id
        channelListings {
          channel {
            slug
          }
          discountValue
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const VOUCHER_CATALOGUES_ADD = gql`
  mutation VoucherCataloguesAdd($id: ID!, $input: CatalogueInput!) {
    voucherCataloguesAdd(id: $id, input: $input) {
      voucher {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const GET_SALES = gql`
  query GetSales($first: Int!) {
    sales(first: $first) {
      edges {
        node {
          id
          name
          type
          startDate
          endDate
          categories(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          collections(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          products(first: 100) {
            edges {
              node {
                id
                slug
              }
            }
          }
          channelListings {
            channel {
              id
              slug
            }
            discountValue
          }
        }
      }
    }
  }
`;

const CREATE_SALE = gql`
  mutation CreateSale($input: SaleInput!) {
    saleCreate(input: $input) {
      sale {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const UPDATE_SALE = gql`
  mutation UpdateSale($id: ID!, $input: SaleInput!) {
    saleUpdate(id: $id, input: $input) {
      sale {
        id
        name
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const SALE_CHANNEL_LISTING_UPDATE = gql`
  mutation SaleChannelListingUpdate($id: ID!, $input: SaleChannelListingInput!) {
    saleChannelListingUpdate(id: $id, input: $input) {
      sale {
        id
        channelListings {
          channel {
            slug
          }
          discountValue
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

const SALE_CATALOGUES_ADD = gql`
  mutation SaleCataloguesAdd($id: ID!, $input: CatalogueInput!) {
    saleCataloguesAdd(id: $id, input: $input) {
      sale {
        id
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

export interface Voucher {
  id: string;
  name?: string;
  code: string;
  type: string;
  discountValueType: string;
  usageLimit?: number;
  used: number;
  startDate?: string;
  endDate?: string;
  applyOncePerOrder: boolean;
  applyOncePerCustomer: boolean;
  onlyForStaff: boolean;
  minCheckoutItemsQuantity?: number;
  categories?: Array<{ id: string; slug: string }>;
  collections?: Array<{ id: string; slug: string }>;
  products?: Array<{ id: string; slug: string }>;
  channelListings?: Array<{
    channel: { id: string; slug: string };
    discountValue: number;
    minSpent?: { amount: number };
  }>;
}

export interface Sale {
  id: string;
  name: string;
  type: string;
  startDate?: string;
  endDate?: string;
  categories?: Array<{ id: string; slug: string }>;
  collections?: Array<{ id: string; slug: string }>;
  products?: Array<{ id: string; slug: string }>;
  channelListings?: Array<{
    channel: { id: string; slug: string };
    discountValue: number;
  }>;
}

export class VoucherRepository {
  constructor(private readonly client: Client) {}

  async getVouchers(): Promise<Voucher[]> {
    const result = await this.client
      .query(GET_VOUCHERS, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch vouchers: ${result.error.message}`);
    }
    
    return result.data?.vouchers.edges.map((edge: any) => edge.node) || [];
  }

  async createVoucher(input: any): Promise<Voucher> {
    const result = await this.client
      .mutation(CREATE_VOUCHER, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create voucher: ${result.error.message}`);
    }
    
    const { voucher, errors } = result.data?.voucherCreate || {};
    if (errors?.length) {
      throw new Error(
        `Voucher creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return voucher;
  }

  async updateVoucher(id: string, input: any): Promise<Voucher> {
    const result = await this.client
      .mutation(UPDATE_VOUCHER, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update voucher: ${result.error.message}`);
    }
    
    const { voucher, errors } = result.data?.voucherUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Voucher update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return voucher;
  }

  async updateVoucherChannelListings(
    id: string,
    channelListings: any[]
  ): Promise<Voucher> {
    const result = await this.client
      .mutation(VOUCHER_CHANNEL_LISTING_UPDATE, { 
        id, 
        input: { 
          addChannels: channelListings,
          removeChannels: [] 
        } 
      })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update voucher channels: ${result.error.message}`);
    }
    
    const { voucher, errors } = result.data?.voucherChannelListingUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Channel listing update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return voucher;
  }

  async addVoucherCatalogues(
    id: string,
    catalogues: {
      products?: string[];
      categories?: string[];
      collections?: string[];
    }
  ): Promise<Voucher> {
    const result = await this.client
      .mutation(VOUCHER_CATALOGUES_ADD, { id, input: catalogues })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to add catalogues: ${result.error.message}`);
    }
    
    const { voucher, errors } = result.data?.voucherCataloguesAdd || {};
    if (errors?.length) {
      throw new Error(
        `Catalogue assignment failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return voucher;
  }

  async getSales(): Promise<Sale[]> {
    const result = await this.client
      .query(GET_SALES, { first: 100 })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to fetch sales: ${result.error.message}`);
    }
    
    return result.data?.sales.edges.map((edge: any) => edge.node) || [];
  }

  async createSale(input: any): Promise<Sale> {
    const result = await this.client
      .mutation(CREATE_SALE, { input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to create sale: ${result.error.message}`);
    }
    
    const { sale, errors } = result.data?.saleCreate || {};
    if (errors?.length) {
      throw new Error(
        `Sale creation failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return sale;
  }

  async updateSale(id: string, input: any): Promise<Sale> {
    const result = await this.client
      .mutation(UPDATE_SALE, { id, input })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update sale: ${result.error.message}`);
    }
    
    const { sale, errors } = result.data?.saleUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Sale update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return sale;
  }

  async updateSaleChannelListings(
    id: string,
    channelListings: any[]
  ): Promise<Sale> {
    const result = await this.client
      .mutation(SALE_CHANNEL_LISTING_UPDATE, { 
        id, 
        input: { 
          addChannels: channelListings,
          removeChannels: [] 
        } 
      })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to update sale channels: ${result.error.message}`);
    }
    
    const { sale, errors } = result.data?.saleChannelListingUpdate || {};
    if (errors?.length) {
      throw new Error(
        `Channel listing update failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return sale;
  }

  async addSaleCatalogues(
    id: string,
    catalogues: {
      products?: string[];
      categories?: string[];
      collections?: string[];
    }
  ): Promise<Sale> {
    const result = await this.client
      .mutation(SALE_CATALOGUES_ADD, { id, input: catalogues })
      .toPromise();
    
    if (result.error) {
      throw new Error(`Failed to add catalogues: ${result.error.message}`);
    }
    
    const { sale, errors } = result.data?.saleCataloguesAdd || {};
    if (errors?.length) {
      throw new Error(
        `Catalogue assignment failed: ${errors
          .map((e: any) => e.message)
          .join(", ")}`
      );
    }
    
    return sale;
  }
} 