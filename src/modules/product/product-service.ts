import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { EntityNotFoundError } from "../config/errors";
import type { ProductInput, ProductVariantInput } from "../config/schema/schema";
import { AttributeResolver } from "./attribute-resolver";
import { ProductError } from "./errors";
import type { Product, ProductOperations, ProductVariant } from "./repository";

export class ProductService {
  private attributeResolver: AttributeResolver;

  constructor(private repository: ProductOperations) {
    this.attributeResolver = new AttributeResolver(repository);
  }

  private async resolveProductTypeReference(productTypeName: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve product type reference",
      "product type",
      productTypeName,
      async () => {
        const productType = await this.repository.getProductTypeByName(productTypeName);
        if (!productType) {
          throw new EntityNotFoundError(
            `Product type "${productTypeName}" not found. Make sure it exists in your productTypes configuration.`
          );
        }
        return productType.id;
      },
      ProductError
    );
  }

  private async resolveCategoryReference(categoryPath: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve category reference",
      "category",
      categoryPath,
      async () => {
        const category = await this.repository.getCategoryByPath(categoryPath);
        if (!category) {
          throw new EntityNotFoundError(
            `Category "${categoryPath}" not found. Make sure it exists in your categories configuration.`
          );
        }
        return category.id;
      },
      ProductError
    );
  }

  private async resolveChannelReference(channelSlug: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve channel reference",
      "channel",
      channelSlug,
      async () => {
        const channel = await this.repository.getChannelBySlug(channelSlug);
        if (!channel) {
          throw new EntityNotFoundError(
            `Channel "${channelSlug}" not found. Make sure it exists in your channels configuration.`
          );
        }
        return channel.id;
      },
      ProductError
    );
  }

  private async resolveChannelListings(
    channelListings: Array<{
      channel: string;
      isPublished?: boolean;
      visibleInListings?: boolean;
      availableForPurchase?: string;
      publishedAt?: string;
    }> = []
  ): Promise<{
    updateChannels: Array<{
      channelId: string;
      isPublished?: boolean;
      visibleInListings?: boolean;
      publishedAt?: string;
    }>;
  }> {
    const updateChannels = [];

    for (const listing of channelListings) {
      const channelId = await this.resolveChannelReference(listing.channel);
      updateChannels.push({
        channelId,
        isPublished: listing.isPublished,
        visibleInListings: listing.visibleInListings,
        publishedAt: listing.publishedAt,
      });
    }

    return { updateChannels };
  }

  private async resolveVariantChannelListings(
    channelListings: Array<{
      channel: string;
      price: number;
      costPrice?: number;
    }> = []
  ): Promise<Array<{ channelId: string; price: number; costPrice?: number }>> {
    const resolvedListings = [];

    for (const listing of channelListings) {
      const channelId = await this.resolveChannelReference(listing.channel);
      resolvedListings.push({
        channelId,
        price: listing.price,
        costPrice: listing.costPrice,
      });
    }

    return resolvedListings;
  }

  private async resolveAttributeValues(
    attributes: Record<string, string | string[]> = {}
  ): Promise<Array<{ id: string; values: string[] }>> {
    return this.attributeResolver.resolveAttributes(attributes);
  }

  private async upsertProduct(productInput: ProductInput): Promise<Product> {
    logger.debug("Looking up existing product", { slug: productInput.slug });

    // Resolve references first
    const productTypeId = await this.resolveProductTypeReference(productInput.productType);
    const categoryId = await this.resolveCategoryReference(productInput.category);

    // Use the slug from the input (required field in schema)
    const slug = productInput.slug;
    const attributes = await this.resolveAttributeValues(productInput.attributes);

    // Use slug for idempotency check (as per CLAUDE.md guidelines)
    const existingProduct = await this.repository.getProductBySlug(slug);

    if (existingProduct) {
      logger.debug("Found existing product, updating", {
        id: existingProduct.id,
        name: existingProduct.name,
        slug: existingProduct.slug,
      });

      // Update existing product (note: productType cannot be changed after creation)
      const product = await this.repository.updateProduct(existingProduct.id, {
        name: productInput.name,
        slug: slug,
        category: categoryId,
        attributes: attributes,
        description: productInput.description,
        // TODO: Handle channel listings in separate commit
      });

      logger.info("Updated existing product", {
        productId: product.id,
        name: product.name,
        slug: product.slug,
      });

      return product;
    }

    logger.debug("Creating new product", { name: productInput.name, slug: slug });

    // Create new product
    const product = await this.repository.createProduct({
      name: productInput.name,
      slug: slug,
      productType: productTypeId,
      category: categoryId,
      attributes: attributes,
      description: productInput.description,
      // TODO: Handle channel listings in separate commit
    });

    logger.info("Created new product", {
      productId: product.id,
      name: product.name,
      slug: product.slug,
    });

    return product;
  }

  private async createProductVariants(
    product: Product,
    variants: ProductVariantInput[]
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
            sku: variantInput.sku,
          });

          // Resolve variant attributes
          const variantAttributes = await this.resolveAttributeValues(variantInput.attributes);

          // Update existing variant (note: can't change product association during update)
          variant = await this.repository.updateProductVariant(existingVariant.id, {
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: variantAttributes,
            // TODO: Handle channelListings in separate commit
          });

          logger.info("Updated existing product variant", {
            variantId: variant.id,
            name: variant.name,
            sku: variant.sku,
          });
        } else {
          logger.debug("Creating new variant", { sku: variantInput.sku });

          // Resolve variant attributes
          const variantAttributes = await this.resolveAttributeValues(variantInput.attributes);

          // Create new variant
          variant = await this.repository.createProductVariant({
            product: product.id,
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: variantAttributes,
            // TODO: Handle channelListings in separate commit
          });

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

  async bootstrapProduct(productInput: ProductInput): Promise<{
    product: Product;
    variants: ProductVariant[];
  }> {
    logger.debug("Bootstrapping product", { name: productInput.name });

    try {
      // 1. Create or get product
      let product = await this.upsertProduct(productInput);

      // 2. Create variants
      const variants = await this.createProductVariants(product, productInput.variants);

      // 3. Update product channel listings (optional, graceful degradation)
      if (productInput.channelListings && productInput.channelListings.length > 0) {
        try {
          const channelListingInput = await this.resolveChannelListings(
            productInput.channelListings
          );
          const updatedProduct = await this.repository.updateProductChannelListings(
            product.id,
            channelListingInput
          );
          if (updatedProduct) {
            product = updatedProduct;
          }
          logger.debug("Product channel listings updated", {
            productId: product.id,
            channelCount: productInput.channelListings.length,
          });
        } catch (error) {
          logger.warn(
            "Failed to update product channel listings, continuing with product creation",
            {
              productId: product.id,
              error: error instanceof Error ? error.message : "Unknown error",
            }
          );
        }
      }

      // 4. Update variant channel listings (optional, graceful degradation)
      const updatedVariants = [...variants];
      for (let i = 0; i < productInput.variants.length; i++) {
        const variantInput = productInput.variants[i];
        const variant = variants[i];

        if (variantInput.channelListings && variantInput.channelListings.length > 0) {
          try {
            const channelListingInput = await this.resolveVariantChannelListings(
              variantInput.channelListings
            );
            const updatedVariant = await this.repository.updateProductVariantChannelListings(
              variant.id,
              channelListingInput
            );
            if (updatedVariant) {
              updatedVariants[i] = updatedVariant;
            }
            logger.debug("Variant channel listings updated", {
              variantId: variant.id,
              channelCount: variantInput.channelListings.length,
            });
          } catch (error) {
            logger.warn(
              "Failed to update variant channel listings, continuing with variant creation",
              {
                variantId: variant.id,
                error: error instanceof Error ? error.message : "Unknown error",
              }
            );
          }
        }
      }

      logger.info("Successfully bootstrapped product", {
        productId: product.id,
        name: product.name,
        variantCount: updatedVariants.length,
      });

      return { product, variants: updatedVariants };
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

    const results = await ServiceErrorWrapper.wrapBatch(
      products,
      "Bootstrap products",
      (product) => product.name,
      (productInput) => this.bootstrapProduct(productInput)
    );

    if (results.failures.length > 0) {
      const errorMessage = `Failed to bootstrap ${results.failures.length} of ${products.length} products`;
      logger.error(errorMessage, {
        failures: results.failures.map((f) => ({
          product: f.item.name,
          error: f.error.message,
        })),
      });
      throw new ProductError(
        errorMessage,
        "PRODUCT_BOOTSTRAP_ERROR",
        results.failures.map((f) => `${f.item.name}: ${f.error.message}`)
      );
    }

    logger.info("Successfully bootstrapped all products", {
      count: products.length,
    });
  }
}
