import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { EntityNotFoundError } from "../config/errors";
import type {
  ProductInput,
  ProductMediaInput,
  ProductVariantInput,
} from "../config/schema/schema";
import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { AttributeResolver } from "./attribute-resolver";
import { ProductError } from "./errors";
import type {
  Product,
  ProductCreateInput,
  ProductMedia,
  ProductMediaCreateInput,
  ProductOperations,
  ProductUpdateInput,
  ProductVariant,
  Attribute,
} from "./repository";

export class ProductService {
  private attributeResolver: AttributeResolver;

  constructor(
    private repository: ProductOperations,
    refs?: {
      getPageBySlug?: (slug: string) => Promise<{ id: string } | null>;
      getChannelIdBySlug?: (slug: string) => Promise<string | null>;
      getAttributeByNameFromCache?: (name: string) => Attribute | null;
      getProductTypeIdByName?: (name: string) => Promise<string | null>;
      getCategoryIdBySlug?: (slug: string) => Promise<string | null>;
    }
  ) {
    this.attributeResolver = new AttributeResolver(repository, refs);
    this.refs = refs;
  }

  private refs?: {
    getPageBySlug?: (slug: string) => Promise<{ id: string } | null>;
    getChannelIdBySlug?: (slug: string) => Promise<string | null>;
    getAttributeByNameFromCache?: (name: string) => Attribute | null;
    getProductTypeIdByName?: (name: string) => Promise<string | null>;
    getCategoryIdBySlug?: (slug: string) => Promise<string | null>;
  };

  // Deployment-scoped caches
  private attributeCache: Map<string, Attribute> = new Map(); // key: name lower
  private productTypeIdCache: Map<string, string> = new Map(); // key: name lower
  private categoryIdCache: Map<string, string> = new Map(); // key: slug lower

  setAttributeCacheAccessor(getter: (name: string) => Attribute | null) {
    this.refs = { ...(this.refs || {}), getAttributeByNameFromCache: getter };
    this.attributeResolver.setRefs(this.refs);
  }

  primeAttributeCache(attributes: Attribute[]) {
    for (const attr of attributes) {
      const key = (attr.name || "").toLowerCase();
      if (key) this.attributeCache.set(key, attr);
    }
    this.setAttributeCacheAccessor((name: string) => this.attributeCache.get(name.toLowerCase()) || null);
  }

  private async resolveProductTypeReference(productTypeName: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve product type reference",
      "product type",
      productTypeName,
      async () => {
        const cached = this.productTypeIdCache.get(productTypeName.toLowerCase());
        if (cached) return cached;

        const productType = await this.repository.getProductTypeByName(productTypeName);
        if (!productType) {
          throw new EntityNotFoundError(
            `Product type "${productTypeName}" not found. Make sure it exists in your productTypes configuration.`
          );
        }
        this.productTypeIdCache.set(productTypeName.toLowerCase(), productType.id);
        return productType.id;
      },
      ProductError
    );
  }

  async getProductBySlug(slug: string): Promise<Product | null | undefined> {
    return this.repository.getProductBySlug(slug);
  }

  private async resolveCategoryReference(categoryPath: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve category reference",
      "category",
      categoryPath,
      async () => {
        const cached = this.categoryIdCache.get(categoryPath.toLowerCase());
        if (cached) return cached;

        const category = await this.repository.getCategoryByPath(categoryPath);
        if (!category) {
          const suggestions = this.buildCategorySuggestions(categoryPath);
          throw new EntityNotFoundError(`Category "${categoryPath}" not found. ${suggestions}`);
        }
        this.categoryIdCache.set(categoryPath.toLowerCase(), category.id);
        return category.id;
      },
      ProductError
    );
  }

  private buildCategorySuggestions(categoryPath: string): string {
    const suggestions = [
      "Make sure it exists in your categories configuration.",
      "Categories must be referenced by their slug (not name).",
    ];

    // Add specific guidance based on the path format
    if (categoryPath.includes("/")) {
      suggestions.push("For nested categories, use the format 'parent-slug/child-slug'.");
    } else {
      suggestions.push(
        "For subcategories, you can reference them directly by slug (e.g., 'juices') or with full path (e.g., 'groceries/juices')."
      );
    }

    suggestions.push("Run introspect command to see available categories.");

    return suggestions.join(" ");
  }

  private async resolveChannelReference(channelSlug: string): Promise<string> {
    return ServiceErrorWrapper.wrapServiceCall(
      "resolve channel reference",
      "channel",
      channelSlug,
      async () => {
        // Prefer injected channel resolver (channel service cache)
        if (this.refs?.getChannelIdBySlug) {
          const id = await this.refs.getChannelIdBySlug(channelSlug);
          if (id) return id;
        }

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
      price?: number;
      costPrice?: number;
    }> = []
  ): Promise<Array<{ channelId: string; price: number; costPrice?: number }>> {
    const resolvedListings = [];

    for (const listing of channelListings) {
      const channelId = await this.resolveChannelReference(listing.channel);
      if (typeof listing.price === "number") {
        resolvedListings.push({
          channelId,
          price: listing.price,
          costPrice: listing.costPrice,
        });
      }
    }

    return resolvedListings;
  }

  private async resolveAttributeValues(
    attributes: Record<string, string | string[]> = {}
  ): Promise<AttributeValueInput[]> {
    // AttributeResolver returns a union payload matching GraphQL AttributeValueInput shape
    // Cast to our local AttributeValueInput type used in ModelService for consistency
    return (await this.attributeResolver.resolveAttributes(attributes)) as unknown as AttributeValueInput[];
  }

  private normalizeExternalMediaUrl(url: string): string {
    return url.trim();
  }

  private async syncProductMedia(
    product: Product,
    mediaInputs: ProductMediaInput[] = []
  ): Promise<void> {
    if (!mediaInputs.length) {
      return;
    }

    const desiredMedia = mediaInputs.filter((media) => typeof media.externalUrl === "string");

    const productReference =
      typeof (product as Product & { slug?: string }).slug === "string"
        ? (product as Product & { slug?: string }).slug ?? product.id
        : product.id;

    const existingMedia = await ServiceErrorWrapper.wrapServiceCall(
      "fetch product media",
      "product media",
      productReference,
      async () => this.repository.listProductMedia(product.id),
      ProductError
    );

    const mediaByUrl = new Map<string, ProductMedia>();
    for (const media of existingMedia) {
      if (!media?.url) {
        continue;
      }
      mediaByUrl.set(this.normalizeExternalMediaUrl(media.url), media);
    }

    const processedUrls = new Set<string>();

    for (const mediaInput of desiredMedia) {
      const normalizedUrl = this.normalizeExternalMediaUrl(mediaInput.externalUrl);

      if (processedUrls.has(normalizedUrl)) {
        continue;
      }
      processedUrls.add(normalizedUrl);

      const existing = mediaByUrl.get(normalizedUrl);

      if (existing) {
        if (typeof mediaInput.alt === "string" && mediaInput.alt !== existing.alt) {
          const updatedMedia = await ServiceErrorWrapper.wrapServiceCall(
            "update product media alt text",
            "product media",
            existing.id,
            async () =>
              this.repository.updateProductMedia(existing.id, {
                alt: mediaInput.alt,
              }),
            ProductError
          );

          mediaByUrl.set(normalizedUrl, updatedMedia);
        }

        continue;
      }

      const createMediaInput = {
        product: product.id,
        mediaUrl: normalizedUrl,
      } as ProductMediaCreateInput;

      if (typeof mediaInput.alt === "string") {
        createMediaInput.alt = mediaInput.alt;
      }

      const createdMedia = await ServiceErrorWrapper.wrapServiceCall(
        "create product media",
        "product media",
        normalizedUrl,
        async () => this.repository.createProductMedia(createMediaInput),
        ProductError
      );

      if (createdMedia?.url) {
        mediaByUrl.set(this.normalizeExternalMediaUrl(createdMedia.url), createdMedia);
      }
    }
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
    const existingProduct = await ServiceErrorWrapper.wrapServiceCall(
      "lookup product by slug",
      "product",
      slug,
      async () => this.repository.getProductBySlug(slug),
      ProductError
    );

    if (existingProduct) {
      logger.debug("Found existing product, updating", {
        id: existingProduct.id,
        name: existingProduct.name,
        // slug: existingProduct.slug,
      });

      // Update existing product (note: productType cannot be changed after creation)
      // Build minimal input - only include fields that are not empty to avoid GraphQL errors  
      const updateProductInput: ProductUpdateInput = {
        name: productInput.name,
        slug: slug,
        category: categoryId,
        attributes: [],
      };

      // Always include attributes array (tests expect this field)
      updateProductInput.attributes = attributes;

      // Safely update description if provided
      if (productInput.description && productInput.description.trim() !== "") {
        const raw = productInput.description.trim();
        // If the description already looks like JSON, pass through; otherwise wrap as EditorJS JSON
        const isJsonLike = raw.startsWith("{") && raw.endsWith("}");
        updateProductInput.description = isJsonLike
          ? raw
          : JSON.stringify({
              time: Date.now(),
              blocks: [
                {
                  id: `desc-${Date.now()}`,
                  data: { text: raw },
                  type: "paragraph",
                },
              ],
              version: "2.24.3",
            });
      }

      let product: Product;
      try {
        product = await ServiceErrorWrapper.wrapServiceCall(
          "update product",
          "product",
          productInput.name,
          async () => this.repository.updateProduct(existingProduct.id, updateProductInput),
          ProductError
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // Fallback: retry without description if server rejects description JSON
        if (
          updateProductInput.description &&
          /description|json|string/i.test(msg)
        ) {
          logger.warn("Retrying product update without description due to error", { msg });
          const retryInput: ProductUpdateInput = { ...updateProductInput, description: undefined };
          product = await ServiceErrorWrapper.wrapServiceCall(
            "update product (retry w/o description)",
            "product",
            productInput.name,
            async () => this.repository.updateProduct(existingProduct.id, retryInput),
            ProductError
          );
        } else {
          throw e;
        }
      }

      logger.info("Updated existing product", {
        productId: product.id,
        name: product.name,
        slug: "slug" in product ? product.slug : "unknown",
      });

      return product;
    }

    logger.debug("Creating new product", { name: productInput.name, slug: slug });

    // Create new product
    // Build minimal input - only include fields that are not empty to avoid GraphQL errors
    const createProductInput: ProductCreateInput = {
      name: productInput.name,
      slug: slug,
      productType: productTypeId,
      category: categoryId,
      attributes: [],
    };

    // Always include attributes array (tests expect this field)
    createProductInput.attributes = attributes;

    // Only include description if provided; if the value looks like JSON, pass through.
    // Otherwise, wrap plain text into a minimal EditorJS JSON structure (Saleor expects JSONString).
    if (productInput.description && productInput.description.trim() !== "") {
      const raw = productInput.description.trim();
      const isJsonLike = raw.startsWith("{") && raw.endsWith("}");
      createProductInput.description = isJsonLike
        ? raw
        : JSON.stringify({
            time: Date.now(),
            blocks: [
              {
                id: `desc-${Date.now()}`,
                data: { text: raw },
                type: "paragraph",
              },
            ],
            version: "2.24.3",
          });
    }


    const product = await ServiceErrorWrapper.wrapServiceCall(
      "create product",
      "product",
      productInput.name,
      async () => this.repository.createProduct(createProductInput),
      ProductError
    );

    logger.info("Created new product", {
      productId: product.id,
      name: product.name,
      slug: "slug" in product ? product.slug : "unknown",
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
        const existingVariant = await ServiceErrorWrapper.wrapServiceCall(
          "lookup product variant by SKU",
          "product variant",
          variantInput.sku,
          async () => this.repository.getProductVariantBySku(variantInput.sku),
          ProductError
        );

        if (existingVariant) {
          logger.debug("Updating existing variant", {
            existingId: existingVariant.id,
            sku: variantInput.sku,
          });

          // Resolve variant attributes
          const variantAttributes = await this.resolveAttributeValues(variantInput.attributes);

          // Update existing variant (note: can't change product association during update)
          variant = await ServiceErrorWrapper.wrapServiceCall(
            "update product variant",
            "product variant",
            variantInput.sku,
            async () =>
              this.repository.updateProductVariant(existingVariant.id, {
                name: variantInput.name,
                sku: variantInput.sku,
                trackInventory: true,
                weight: variantInput.weight,
                attributes: variantAttributes,
                // TODO: Handle channelListings in separate commit
              }),
            ProductError
          );

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
          variant = await ServiceErrorWrapper.wrapServiceCall(
            "create product variant",
            "product variant",
            variantInput.sku,
            async () =>
              this.repository.createProductVariant({
                product: product.id,
                name: variantInput.name,
                sku: variantInput.sku,
                trackInventory: true,
                weight: variantInput.weight,
                attributes: variantAttributes,
                // TODO: Handle channelListings in separate commit
              }),
            ProductError
          );

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

      // 2. Sync product media (external URLs)
      if (productInput.media !== undefined) {
        await this.syncProductMedia(product, productInput.media);
      }

      // 3. Create variants
      const variants = await this.createProductVariants(product, productInput.variants);

      // 4. Update product channel listings (optional, graceful degradation)
      if (productInput.channelListings && productInput.channelListings.length > 0) {
        try {
          const channelListingInput = await this.resolveChannelListings(
            productInput.channelListings
          );
          const updatedProduct = await ServiceErrorWrapper.wrapServiceCall(
            "update product channel listings",
            "product",
            product.id,
            async () =>
              this.repository.updateProductChannelListings(product.id, channelListingInput),
            ProductError
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

      // 5. Update variant channel listings (optional, graceful degradation)
      const updatedVariants = [...variants];
      for (let i = 0; i < productInput.variants.length; i++) {
        const variantInput = productInput.variants[i];
        const variant = variants[i];

        if (variantInput.channelListings && variantInput.channelListings.length > 0) {
          try {
            const channelListingInput = await this.resolveVariantChannelListings(
              variantInput.channelListings
            );
            const updatedVariant = await ServiceErrorWrapper.wrapServiceCall(
              "update product variant channel listings",
              "product variant",
              variant.id,
              async () =>
                this.repository.updateProductVariantChannelListings(
                  variant.id,
                  channelListingInput
                ),
              ProductError
            );
            if (updatedVariant) {
              updatedVariants[i] = updatedVariant as ProductVariant;
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
