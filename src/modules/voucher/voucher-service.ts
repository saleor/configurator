import { logger } from "../../lib/logger";
import type { ChannelService } from "../channel/channel-service";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
import type { ProductService } from "../product/product-service";
import type { VoucherRepository } from "./repository";

export interface VoucherInput {
  name?: string;
  code: string;
  type?: "SHIPPING" | "ENTIRE_ORDER" | "SPECIFIC_PRODUCT";
  discountValueType: "FIXED" | "PERCENTAGE";
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  applyOncePerOrder?: boolean;
  applyOncePerCustomer?: boolean;
  onlyForStaff?: boolean;
  minCheckoutItemsQuantity?: number;
  categories?: string[];
  collections?: string[];
  products?: string[];
  channelListings?: Array<{
    channelSlug: string;
    discountValue: number;
    minSpent?: number;
  }>;
}

export interface SaleInput {
  name: string;
  type?: "FIXED" | "PERCENTAGE";
  startDate?: string;
  endDate?: string;
  categories?: string[];
  collections?: string[];
  products?: string[];
  channelListings?: Array<{
    channelSlug: string;
    discountValue: number;
  }>;
}

export class VoucherService {
  constructor(
    private readonly repository: VoucherRepository,
    private readonly channelService: ChannelService,
    private readonly categoryService: CategoryService,
    private readonly collectionService: CollectionService,
    private readonly productService: ProductService
  ) {}

  async upsertVouchers(vouchers: VoucherInput[]) {
    logger.info(`Upserting ${vouchers.length} vouchers`);
    
    const existingVouchers = await this.repository.getVouchers();
    const existingVoucherMap = new Map(
      existingVouchers.map((voucher) => [voucher.code, voucher])
    );
    
    const results = [];
    
    for (const voucherInput of vouchers) {
      try {
        const existingVoucher = existingVoucherMap.get(voucherInput.code);
        let voucher;
        
        if (existingVoucher) {
          logger.debug(`Updating existing voucher: ${voucherInput.code}`);
          voucher = await this.updateVoucher(existingVoucher.id, voucherInput);
        } else {
          logger.debug(`Creating new voucher: ${voucherInput.code}`);
          voucher = await this.createVoucher(voucherInput);
        }
        
        results.push(voucher);
      } catch (error) {
        logger.error(`Failed to upsert voucher ${voucherInput.code}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createVoucher(input: VoucherInput) {
    const createInput = {
      name: input.name,
      code: input.code,
      type: input.type || "ENTIRE_ORDER",
      discountValueType: input.discountValueType,
      usageLimit: input.usageLimit,
      startDate: input.startDate,
      endDate: input.endDate,
      applyOncePerOrder: input.applyOncePerOrder ?? false,
      applyOncePerCustomer: input.applyOncePerCustomer ?? false,
      onlyForStaff: input.onlyForStaff ?? false,
      minCheckoutItemsQuantity: input.minCheckoutItemsQuantity,
    };
    
    const voucher = await this.repository.createVoucher(createInput);
    
    if (input.channelListings?.length) {
      await this.updateVoucherChannelListings(voucher.id, input.channelListings);
    }
    
    const catalogues = await this.prepareCatalogues(
      input.categories,
      input.collections,
      input.products
    );
    
    if (catalogues) {
      await this.repository.addVoucherCatalogues(voucher.id, catalogues);
    }
    
    return voucher;
  }

  private async updateVoucher(id: string, input: VoucherInput) {
    const updateInput = {
      name: input.name,
      code: input.code,
      type: input.type,
      discountValueType: input.discountValueType,
      usageLimit: input.usageLimit,
      startDate: input.startDate,
      endDate: input.endDate,
      applyOncePerOrder: input.applyOncePerOrder,
      applyOncePerCustomer: input.applyOncePerCustomer,
      onlyForStaff: input.onlyForStaff,
      minCheckoutItemsQuantity: input.minCheckoutItemsQuantity,
    };
    
    const voucher = await this.repository.updateVoucher(id, updateInput);
    
    if (input.channelListings) {
      await this.updateVoucherChannelListings(id, input.channelListings);
    }
    
    const catalogues = await this.prepareCatalogues(
      input.categories,
      input.collections,
      input.products
    );
    
    if (catalogues) {
      await this.repository.addVoucherCatalogues(id, catalogues);
    }
    
    return voucher;
  }

  private async updateVoucherChannelListings(
    voucherId: string,
    listings: VoucherInput["channelListings"]
  ) {
    if (!listings?.length) return;
    
    const channelListings = [];
    
    for (const listing of listings) {
      const channels = await this.channelService.getChannelsBySlug([listing.channelSlug]);
      
      if (channels.length === 0) {
        throw new Error(`Channel not found: ${listing.channelSlug}`);
      }
      
      channelListings.push({
        channelId: channels[0].id,
        discountValue: listing.discountValue,
        minSpent: listing.minSpent,
      });
    }
    
    await this.repository.updateVoucherChannelListings(voucherId, channelListings);
  }

  async upsertSales(sales: SaleInput[]) {
    logger.info(`Upserting ${sales.length} sales`);
    
    const existingSales = await this.repository.getSales();
    const existingSaleMap = new Map(
      existingSales.map((sale) => [sale.name, sale])
    );
    
    const results = [];
    
    for (const saleInput of sales) {
      try {
        const existingSale = existingSaleMap.get(saleInput.name);
        let sale;
        
        if (existingSale) {
          logger.debug(`Updating existing sale: ${saleInput.name}`);
          sale = await this.updateSale(existingSale.id, saleInput);
        } else {
          logger.debug(`Creating new sale: ${saleInput.name}`);
          sale = await this.createSale(saleInput);
        }
        
        results.push(sale);
      } catch (error) {
        logger.error(`Failed to upsert sale ${saleInput.name}`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private async createSale(input: SaleInput) {
    const createInput = {
      name: input.name,
      type: input.type || "PERCENTAGE",
      startDate: input.startDate,
      endDate: input.endDate,
    };
    
    const sale = await this.repository.createSale(createInput);
    
    if (input.channelListings?.length) {
      await this.updateSaleChannelListings(sale.id, input.channelListings);
    }
    
    const catalogues = await this.prepareCatalogues(
      input.categories,
      input.collections,
      input.products
    );
    
    if (catalogues) {
      await this.repository.addSaleCatalogues(sale.id, catalogues);
    }
    
    return sale;
  }

  private async updateSale(id: string, input: SaleInput) {
    const updateInput = {
      name: input.name,
      type: input.type,
      startDate: input.startDate,
      endDate: input.endDate,
    };
    
    const sale = await this.repository.updateSale(id, updateInput);
    
    if (input.channelListings) {
      await this.updateSaleChannelListings(id, input.channelListings);
    }
    
    const catalogues = await this.prepareCatalogues(
      input.categories,
      input.collections,
      input.products
    );
    
    if (catalogues) {
      await this.repository.addSaleCatalogues(id, catalogues);
    }
    
    return sale;
  }

  private async updateSaleChannelListings(
    saleId: string,
    listings: SaleInput["channelListings"]
  ) {
    if (!listings?.length) return;
    
    const channelListings = [];
    
    for (const listing of listings) {
      const channels = await this.channelService.getChannelsBySlug([listing.channelSlug]);
      
      if (channels.length === 0) {
        throw new Error(`Channel not found: ${listing.channelSlug}`);
      }
      
      channelListings.push({
        channelId: channels[0].id,
        discountValue: listing.discountValue,
      });
    }
    
    await this.repository.updateSaleChannelListings(saleId, channelListings);
  }

  private async prepareCatalogues(
    categorySlugs?: string[],
    collectionSlugs?: string[],
    productSlugs?: string[]
  ) {
    const catalogues: {
      categories?: string[];
      collections?: string[];
      products?: string[];
    } = {};
    
    if (categorySlugs?.length) {
      const categories = await this.categoryService.getCategoriesBySlugs(categorySlugs);
      catalogues.categories = categories.map((c) => c.id);
    }
    
    if (collectionSlugs?.length) {
      const collections = await this.collectionService.getCollectionsBySlugs(collectionSlugs);
      catalogues.collections = collections.map((c) => c.id);
    }
    
    if (productSlugs?.length) {
      const products = await this.productService.getProductsBySlugs(productSlugs);
      catalogues.products = products.map((p) => p.id);
    }
    
    return Object.keys(catalogues).length > 0 ? catalogues : null;
  }
} 