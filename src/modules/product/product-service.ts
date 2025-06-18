import type { SaleorConfig } from "../config/schema";
import { logger } from "../../lib/logger";
import type { 
  ProductOperations, 
  Product, 
  ProductCreateInput,
  ProductChannelListingUpdateInput 
} from "./repository";
import type { ChannelService } from "../channel/channel-service";
import type { ProductTypeService } from "../product-type/product-type-service";
import type { CategoryService } from "../category/category-service";
import type { CollectionService } from "../collection/collection-service";
import type { AttributeService } from "../attribute/attribute-service";

type ProductInput = NonNullable<SaleorConfig["products"]>[number];

export class ProductService {
  constructor(
    private repository: ProductOperations,
    private channelService: ChannelService,
    private productTypeService: ProductTypeService,
    private categoryService: CategoryService,
    private collectionService: CollectionService,
    private attributeService: AttributeService
  ) {}

  async upsertProducts(products: NonNullable<SaleorConfig["products"]>) {
    for (const product of products) {
      await this.upsertProduct(product);
    }
  }

  private async upsertProduct(input: ProductInput) {
    // Try to get product from first channel
    const channels = await this.channelService.getAllChannels();
    const firstChannel = channels?.[0];
    
    const existing = await this.repository.getProductBySlug(
      input.slug,
      firstChannel?.slug
    );

    let product: Product;
    if (existing) {
      product = await this.updateProduct(existing.id, input);
    } else {
      product = await this.createProduct(input);
    }

    // Handle channel assignments
    if (input.channelListings && input.channelListings.length > 0) {
      await this.updateChannelListings(product.id, input.channelListings);
    }

    // Handle collection assignments
    if (input.collections && input.collections.length > 0) {
      await this.assignToCollections(product.id, input.collections);
    }
  }

  private async createProduct(input: ProductInput): Promise<Product> {
    logger.info(`Creating product: ${input.name}`);

    // Get product type
    const productType = await this.productTypeService.getProductTypeByName(
      input.productTypeName
    );
    if (!productType) {
      throw new Error(`Product type not found: ${input.productTypeName}`);
    }

    // Get category if specified
    let categoryId: string | undefined;
    if (input.categorySlug) {
      const category = await this.categoryService.getCategoryBySlug(
        input.categorySlug
      );
      if (!category) {
        throw new Error(`Category not found: ${input.categorySlug}`);
      }
      categoryId = category.id;
    }

    // Prepare attributes
    const attributes = await this.prepareAttributeValues(
      input.attributes || []
    );

    const createInput: ProductCreateInput = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      productType: productType.id,
      category: categoryId,
      attributes,
      weight: input.weight,
      rating: input.rating,
    };

    return this.repository.createProduct(createInput);
  }

  private async updateProduct(id: string, input: ProductInput): Promise<Product> {
    logger.info(`Updating product: ${input.name}`);

    // Get category if specified
    let categoryId: string | undefined;
    if (input.categorySlug) {
      const category = await this.categoryService.getCategoryBySlug(
        input.categorySlug
      );
      if (!category) {
        throw new Error(`Category not found: ${input.categorySlug}`);
      }
      categoryId = category.id;
    }

    // Prepare attributes
    const attributes = await this.prepareAttributeValues(
      input.attributes || []
    );

    const updateInput = {
      name: input.name,
      description: input.description,
      category: categoryId,
      attributes,
      weight: input.weight,
      rating: input.rating,
    };

    return this.repository.updateProduct(id, updateInput);
  }

  private async updateChannelListings(
    productId: string,
    channelListings: NonNullable<ProductInput["channelListings"]>
  ) {
    const channels = await this.channelService.getAllChannels();
    
    const updateChannels = channelListings.map((listing: any) => {
      const channel = channels?.find((ch: any) => ch.slug === listing.channelSlug);
      if (!channel) {
        throw new Error(`Channel not found: ${listing.channelSlug}`);
      }
      return {
        channelId: channel.id,
        isPublished: listing.isPublished ?? true,
        publishedAt: listing.publishedAt,
        visibleInListings: listing.visibleInListings ?? true,
        isAvailableForPurchase: listing.isAvailableForPurchase ?? true,
        availableForPurchaseAt: listing.availableForPurchaseAt,
      };
    });

    const updateInput: ProductChannelListingUpdateInput = {
      updateChannels,
    };

    await this.repository.updateProductChannelListings(productId, updateInput);
  }

  private async assignToCollections(
    productId: string,
    collectionSlugs: string[]
  ) {
    // This would require getting collections and adding the product to them
    // For now, we'll log this as a TODO
    logger.info(`TODO: Assign product ${productId} to collections: ${collectionSlugs.join(", ")}`);
  }

  private async prepareAttributeValues(
    attributes: NonNullable<ProductInput["attributes"]>
  ) {
    return Promise.all(
      attributes.map(async (attr: any) => {
        const attribute = await this.attributeService.getAttributeByName(
          attr.name
        );
        if (!attribute) {
          throw new Error(`Attribute not found: ${attr.name}`);
        }

        // Handle different input types
        if (attribute.inputType === "DROPDOWN" || attribute.inputType === "SWATCH") {
          return {
            id: attribute.id,
            dropdown: { value: attr.value },
          };
        } else if (attribute.inputType === "MULTISELECT") {
          return {
            id: attribute.id,
            multiselect: Array.isArray(attr.value)
              ? attr.value.map(v => ({ value: v }))
              : [{ value: attr.value }],
          };
        } else if (attribute.inputType === "NUMERIC") {
          return {
            id: attribute.id,
            numeric: String(attr.value),
          };
        } else if (attribute.inputType === "BOOLEAN") {
          return {
            id: attribute.id,
            boolean: attr.value === "true" || attr.value === true,
          };
        } else if (attribute.inputType === "DATE") {
          return {
            id: attribute.id,
            date: attr.value,
          };
        } else if (attribute.inputType === "DATE_TIME") {
          return {
            id: attribute.id,
            dateTime: attr.value,
          };
        } else if (attribute.inputType === "RICH_TEXT") {
          return {
            id: attribute.id,
            richText: attr.value,
          };
        } else {
          // PLAIN_TEXT and others
          return {
            id: attribute.id,
            plainText: String(attr.value),
          };
        }
      })
    );
  }

  async getProductTypeByName(name: string) {
    return this.productTypeService.getProductTypeByName(name);
  }

  async getCategoryBySlug(slug: string) {
    return this.categoryService.getCategoryBySlug(slug);
  }

  async getProductsBySlugs(slugs: string[]) {
    logger.debug("Getting products by slugs", { slugs });
    const products = [];
    const channels = await this.channelService.getAllChannels();
    const firstChannel = channels?.[0];
    
    for (const slug of slugs) {
      const product = await this.repository.getProductBySlug(
        slug,
        firstChannel?.slug
      );
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }
} 