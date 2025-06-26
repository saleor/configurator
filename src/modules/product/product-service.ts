import type { 
  ProductInput, 
  ProductVariantInput
} from "../config/schema";
import { logger } from "../../lib/logger";
import type { ProductOperations, Product, ProductVariant, Attribute } from "./repository";
import type { ChannelOperations } from "../channel/repository";

export class ProductService {
  constructor(
    private repository: ProductOperations,
    private channelRepository: ChannelOperations
  ) {}

  private async resolveProductTypeReference(productTypeName: string): Promise<string> {
    const productType = await this.repository.getProductTypeByName(productTypeName);
    if (!productType) {
      throw new Error(`Product type "${productTypeName}" not found. Make sure it exists in your productTypes configuration.`);
    }
    return productType.id;
  }

  private async resolveCategoryReference(categoryPath: string): Promise<string> {
    const category = await this.repository.getCategoryByPath(categoryPath);
    if (!category) {
      throw new Error(`Category "${categoryPath}" not found. Make sure it exists in your categories configuration.`);
    }
    return category.id;
  }

  private async resolveChannelReference(channelSlug: string): Promise<string> {
    const channel = await this.channelRepository.getChannelBySlug(channelSlug);
    if (!channel) {
      throw new Error(`Channel "${channelSlug}" not found. Make sure it exists in your channels configuration.`);
    }
    return channel.id;
  }

  private async resolveProductChannelListings(
    channelListings: ProductInput["channelListings"] = [],
    channelCache?: Map<string, string>
  ): Promise<Array<{ channelId: string; isPublished?: boolean; visibleInListings?: boolean; availableForPurchase?: string; publishedAt?: string }>> {
    logger.debug("Resolving product channel listings", { channelListings });

    const resolvedListings = [];
    
    // Use cache if provided, otherwise resolve individually
    for (const listing of channelListings) {
      try {
        const channelId = channelCache?.get(listing.channel) || await this.resolveChannelReference(listing.channel);
        resolvedListings.push({
          channelId,
          isPublished: listing.isPublished,
          visibleInListings: listing.visibleInListings,
          availableForPurchase: listing.availableForPurchase,
          publishedAt: listing.publishedAt,
        });
      } catch (error) {
        logger.error(`Failed to resolve channel listing for channel "${listing.channel}"`, {
          channel: listing.channel,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    }

    logger.debug("Resolved product channel listings", { 
      input: channelListings,
      resolved: resolvedListings 
    });

    return resolvedListings;
  }

  private async resolveVariantChannelListings(
    channelListings: ProductVariantInput["channelListings"],
    channelCache?: Map<string, string>
  ): Promise<Array<{ channelId: string; price: string; costPrice?: string }>> {
    logger.debug("Resolving variant channel listings", { channelListings });

    const resolvedListings = [];
    
    for (const listing of channelListings) {
      try {
        const channelId = channelCache?.get(listing.channel) || await this.resolveChannelReference(listing.channel);
        resolvedListings.push({
          channelId,
          price: listing.price.toString(),
          costPrice: listing.costPrice?.toString(),
        });
      } catch (error) {
        logger.error(`Failed to resolve variant channel listing for channel "${listing.channel}"`, {
          channel: listing.channel,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    }

    logger.debug("Resolved variant channel listings", { 
      input: channelListings,
      resolved: resolvedListings 
    });

    return resolvedListings;
  }

  private async resolveAttributeValues(
    attributes: Record<string, string | number | (string | number)[]> = {},
    attributeCache?: Map<string, Attribute>
  ): Promise<Array<{ id: string; values: string[] }>> {
    logger.debug("Resolving attribute values", { attributes });

    const resolvedAttributes = [];
    const attributeNames = Object.keys(attributes);
    
    // Use cache if provided, otherwise batch fetch all attributes
    let attributeMap: Map<string, Attribute>;
    if (attributeCache) {
      attributeMap = attributeCache;
    } else {
      attributeMap = new Map();
      // Batch fetch all attributes at once
      for (const attributeName of attributeNames) {
        const attribute = await this.repository.getAttributeByName(attributeName);
        if (attribute) {
          attributeMap.set(attributeName, attribute);
        }
      }
    }

    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      try {
        const attribute = attributeMap.get(attributeName);
        if (!attribute) {
          logger.warn(`Attribute "${attributeName}" not found, skipping`);
          continue;
        }

        let values: string[];

        if (attribute.inputType === "PLAIN_TEXT" || attribute.inputType === "NUMERIC") {
          // For plain text and numeric, use the value as-is (convert to string)
          values = Array.isArray(attributeValue) 
            ? attributeValue.map(v => String(v))
            : [String(attributeValue)];
        } else if (attribute.inputType === "DROPDOWN") {
          // For dropdown, resolve value names to choice IDs
          const valueNames = Array.isArray(attributeValue) 
            ? attributeValue.map(v => String(v))
            : [String(attributeValue)];
          values = [];

          for (const valueName of valueNames) {
            const choice = attribute.choices?.edges?.find(
              (edge) => edge.node.name === valueName || edge.node.value === valueName
            );
            if (choice) {
              values.push(choice.node.id);
            } else {
              logger.warn(`Choice "${valueName}" not found for attribute "${attributeName}"`);
            }
          }
        } else if (attribute.inputType === "REFERENCE") {
          // For reference attributes, resolve referenced entity names to IDs
          // This is a simplified implementation - in reality, you'd need to know the entity type
          const valueNames = Array.isArray(attributeValue) 
            ? attributeValue.map(v => String(v))
            : [String(attributeValue)];
          values = [];

          for (const valueName of valueNames) {
            // Try to resolve as product name (most common case)
            const referencedProduct = await this.repository.getProductByName(valueName);
            if (referencedProduct) {
              values.push(referencedProduct.id);
            } else {
              logger.warn(`Referenced entity "${valueName}" not found for attribute "${attributeName}"`);
            }
          }
        } else {
          logger.warn(`Unsupported attribute input type: ${attribute.inputType}`);
          continue;
        }

        if (values.length > 0) {
          resolvedAttributes.push({
            id: attribute.id,
            values,
          });
        }
      } catch (error) {
        logger.error(`Failed to resolve attribute "${attributeName}"`, {
          attributeName,
          attributeValue,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    logger.debug("Resolved attributes", { 
      input: attributes,
      resolved: resolvedAttributes 
    });

    return resolvedAttributes;
  }

  private async upsertProduct(
    productInput: ProductInput, 
    caches?: {
      channels?: Map<string, string>;
      attributes?: Map<string, Attribute>;
      productTypes?: Map<string, string>;
      categories?: Map<string, string>;
    }
  ): Promise<Product> {
    logger.debug("Looking up existing product", { name: productInput.name });
    
    // Resolve references first
    const productTypeId = caches?.productTypes?.get(productInput.productType) || await this.resolveProductTypeReference(productInput.productType);
    const categoryId = caches?.categories?.get(productInput.category) || await this.resolveCategoryReference(productInput.category);
    const slug = productInput.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const attributes = await this.resolveAttributeValues(productInput.attributes, caches?.attributes);
    
    const existingProduct = await this.repository.getProductByName(productInput.name);
    
    if (existingProduct) {
      logger.debug("Found existing product, updating", {
        id: existingProduct.id,
        name: existingProduct.name,
      });
      
      // Update existing product (note: productType cannot be changed after creation)
      let product = await this.repository.updateProduct(existingProduct.id, {
        name: productInput.name,
        slug: slug,
        category: categoryId,
        attributes: attributes,
        // TODO: Handle description (needs JSONString format for rich text)
      });

      // Update channel listings if provided
      if (productInput.channelListings && productInput.channelListings.length > 0) {
        const resolvedChannelListings = await this.resolveProductChannelListings(productInput.channelListings, caches?.channels);
        
        product = await this.repository.updateProductChannelListings(existingProduct.id, {
          updateChannels: resolvedChannelListings.map(listing => ({
            channelId: listing.channelId,
            isPublished: listing.isPublished,
            visibleInListings: listing.visibleInListings,
            isAvailableForPurchase: !!listing.availableForPurchase,
            availableForPurchaseAt: listing.availableForPurchase,
            publishedAt: listing.publishedAt,
          })),
        });
      }
      
      return product;
    }

    logger.debug("Creating new product", { name: productInput.name });

    // Create new product
    let product = await this.repository.createProduct({
      name: productInput.name,
      slug: slug,
      productType: productTypeId,
      category: categoryId,
      attributes: attributes,
      // TODO: Handle description (needs JSONString format for rich text)
    });

    // Add channel listings if provided
    if (productInput.channelListings && productInput.channelListings.length > 0) {
      const resolvedChannelListings = await this.resolveProductChannelListings(productInput.channelListings, caches?.channels);
      
      product = await this.repository.updateProductChannelListings(product.id, {
        updateChannels: resolvedChannelListings.map(listing => ({
          channelId: listing.channelId,
          isPublished: listing.isPublished,
          visibleInListings: listing.visibleInListings,
          isAvailableForPurchase: !!listing.availableForPurchase,
          availableForPurchaseAt: listing.availableForPurchase,
          publishedAt: listing.publishedAt,
        })),
      });
    }

    return product;
  }

  private async createProductVariants(
    product: Product, 
    variants: ProductVariantInput[],
    caches?: {
      channels?: Map<string, string>;
      attributes?: Map<string, Attribute>;
    }
  ): Promise<ProductVariant[]> {
    logger.debug("Creating product variants", {
      productId: product.id,
      variantCount: variants.length,
    });

    const createdVariants: ProductVariant[] = [];

    for (const variantInput of variants) {
      try {
        let variant: ProductVariant;
        
        // Check if variant with this SKU already exists
        const existingVariant = await this.repository.getProductVariantBySku(variantInput.sku);
        
        if (existingVariant) {
          logger.debug("Updating existing variant", { 
            existingId: existingVariant.id,
            sku: variantInput.sku 
          });
          
          // Resolve variant attributes
          const variantAttributes = await this.resolveAttributeValues(variantInput.attributes, caches?.attributes);
          
          // Update existing variant (note: can't change product association during update)
          variant = await this.repository.updateProductVariant(existingVariant.id, {
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: variantAttributes,
          });

          // Update variant channel listings
          if (variantInput.channelListings && variantInput.channelListings.length > 0) {
            const resolvedChannelListings = await this.resolveVariantChannelListings(variantInput.channelListings, caches?.channels);
            
            variant = await this.repository.updateProductVariantChannelListings(existingVariant.id, 
              resolvedChannelListings.map(listing => ({
                channelId: listing.channelId,
                price: listing.price,
                costPrice: listing.costPrice,
              }))
            );
          }
          
          logger.info("Updated existing product variant", {
            variantId: variant.id,
            name: variant.name,
            sku: variant.sku,
          });
        } else {
          logger.debug("Creating new variant", { sku: variantInput.sku });
          
          // Resolve variant attributes
          const variantAttributes = await this.resolveAttributeValues(variantInput.attributes, caches?.attributes);
          
          // Create new variant
          variant = await this.repository.createProductVariant({
            product: product.id,
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: variantAttributes,
          });

          // Add variant channel listings
          if (variantInput.channelListings && variantInput.channelListings.length > 0) {
            const resolvedChannelListings = await this.resolveVariantChannelListings(variantInput.channelListings, caches?.channels);
            
            variant = await this.repository.updateProductVariantChannelListings(variant.id, 
              resolvedChannelListings.map(listing => ({
                channelId: listing.channelId,
                price: listing.price,
                costPrice: listing.costPrice,
              }))
            );
          }
          
          logger.info("Created new product variant", {
            variantId: variant.id,
            name: variant.name,
            sku: variant.sku,
          });
        }

        createdVariants.push(variant);
      } catch (error) {
        logger.error("Failed to create/update product variant", {
          productId: product.id,
          variantName: variantInput.name,
          variantSku: variantInput.sku,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    }

    return createdVariants;
  }

  async bootstrapProduct(
    productInput: ProductInput,
    caches?: {
      channels?: Map<string, string>;
      attributes?: Map<string, Attribute>;
      productTypes?: Map<string, string>;
      categories?: Map<string, string>;
    }
  ): Promise<{
    product: Product;
    variants: ProductVariant[];
  }> {
    logger.debug("Bootstrapping product", { name: productInput.name });

    try {
      // 1. Create or get product
      const product = await this.upsertProduct(productInput, caches);

      // 2. Create variants
      const variants = await this.createProductVariants(product, productInput.variants, caches);

      logger.info("Successfully bootstrapped product", {
        productId: product.id,
        name: product.name,
        variantCount: variants.length,
      });

      return { product, variants };
    } catch (error) {
      logger.error("Failed to bootstrap product", {
        name: productInput.name,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async bootstrapProducts(products: ProductInput[]): Promise<void> {
    logger.debug("Bootstrapping products", { count: products.length });

    // Build caches to reduce API calls
    logger.debug("Building lookup caches for performance optimization");
    
    const caches = {
      channels: new Map<string, string>(),
      attributes: new Map<string, Attribute>(),
      productTypes: new Map<string, string>(),
      categories: new Map<string, string>(),
    };

    // Pre-populate channels cache
    const uniqueChannels = new Set<string>();
    products.forEach(product => {
      product.channelListings?.forEach(listing => uniqueChannels.add(listing.channel));
      product.variants.forEach(variant => {
        variant.channelListings?.forEach(listing => uniqueChannels.add(listing.channel));
      });
    });
    
    for (const channelSlug of uniqueChannels) {
      try {
        const channelId = await this.resolveChannelReference(channelSlug);
        caches.channels.set(channelSlug, channelId);
      } catch (error) {
        logger.warn(`Failed to cache channel ${channelSlug}`, { error });
      }
    }
    
    // Pre-populate product types cache
    const uniqueProductTypes = new Set<string>();
    products.forEach(product => uniqueProductTypes.add(product.productType));
    
    for (const productTypeName of uniqueProductTypes) {
      try {
        const productTypeId = await this.resolveProductTypeReference(productTypeName);
        caches.productTypes.set(productTypeName, productTypeId);
      } catch (error) {
        logger.warn(`Failed to cache product type ${productTypeName}`, { error });
      }
    }
    
    // Pre-populate categories cache
    const uniqueCategories = new Set<string>();
    products.forEach(product => uniqueCategories.add(product.category));
    
    for (const categoryPath of uniqueCategories) {
      try {
        const categoryId = await this.resolveCategoryReference(categoryPath);
        caches.categories.set(categoryPath, categoryId);
      } catch (error) {
        logger.warn(`Failed to cache category ${categoryPath}`, { error });
      }
    }
    
    // Pre-populate attributes cache
    const uniqueAttributes = new Set<string>();
    products.forEach(product => {
      Object.keys(product.attributes || {}).forEach(attr => uniqueAttributes.add(attr));
      product.variants.forEach(variant => {
        Object.keys(variant.attributes || {}).forEach(attr => uniqueAttributes.add(attr));
      });
    });
    
    for (const attributeName of uniqueAttributes) {
      try {
        const attribute = await this.repository.getAttributeByName(attributeName);
        if (attribute) {
          caches.attributes.set(attributeName, attribute);
        }
      } catch (error) {
        logger.warn(`Failed to cache attribute ${attributeName}`, { error });
      }
    }

    logger.debug("Caches built", {
      channels: caches.channels.size,
      attributes: caches.attributes.size,
      productTypes: caches.productTypes.size,
      categories: caches.categories.size,
    });

    // Process products sequentially to handle potential cross-references
    for (const productInput of products) {
      await this.bootstrapProduct(productInput, caches);
    }

    logger.info("Successfully bootstrapped all products", { count: products.length });
  }
}