import type { AttributeValueInput } from "../../lib/graphql/graphql-types";
import { logger } from "../../lib/logger";
import { ServiceErrorWrapper } from "../../lib/utils/error-wrapper";
import { EntityNotFoundError } from "../config/errors";
import type { ProductInput, ProductMediaInput, ProductVariantInput } from "../config/schema/schema";
import { AttributeResolver } from "./attribute-resolver";
import { ProductError } from "./errors";
import { extractSourceUrlFromMetadata } from "./media-metadata";
import type {
  Attribute,
  Product,
  ProductCreateInput,
  ProductMedia,
  ProductMediaCreateInput,
  ProductOperations,
  ProductUpdateInput,
  ProductVariant,
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
    this.setAttributeCacheAccessor(
      (name: string) => this.attributeCache.get(name.toLowerCase()) || null
    );
  }

  /**
   * Pre-warm caches with bulk data to reduce individual queries
   */
  async preCacheProducts(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;

    // Fetch all products in bulk
    const products = await this.repository.getProductsBySlugs(slugs);

    // Cache them for future use
    products.forEach((product) => {
      if (product?.slug) {
        // You could store these in a local cache if needed
        // For now, this just ensures they're fetched efficiently
      }
    });
  }

  /**
   * Process items in chunks to avoid rate limiting
   */
  private async processInChunks<T, R>(
    items: T[],
    processor: (chunk: T[]) => Promise<R[]>,
    chunkSize: number = 10
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);

      // Small delay between chunks to avoid rate limiting
      if (i + chunkSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
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
      isAvailableForPurchase?: boolean;
      availableForPurchaseAt?: string;
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
    return (await this.attributeResolver.resolveAttributes(
      attributes
    )) as unknown as AttributeValueInput[];
  }

  private normalizeExternalMediaUrl(url: string): string {
    return url.trim();
  }

  /**
   * Extracts a content fingerprint from a media URL for intelligent comparison.
   * This allows us to identify the same media even when Saleor transforms the URL.
   */
  private extractMediaFingerprint(url: string): string {
    const normalizedUrl = url.trim();

    // Handle Saleor thumbnail URLs: extract the media ID (case-insensitive match)
    const saleorThumbnailMatch = normalizedUrl.match(/\/thumbnail\/([^/]+)\//i);
    if (saleorThumbnailMatch) {
      return `saleor:${saleorThumbnailMatch[1]}`;
    }

    // For external URLs, extract filename and domain for content-based comparison
    try {
      const urlObj = new URL(normalizedUrl);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop() || "";
      const domain = urlObj.hostname.toLowerCase(); // Normalize domain to lowercase

      // Create a content fingerprint from domain + filename (preserve filename case)
      return `external:${domain}:${filename}`;
    } catch {
      // Fallback to normalized URL if parsing fails
      return `url:${normalizedUrl.toLowerCase()}`;
    }
  }

  /**
   * Checks if two media arrays are functionally equivalent, accounting for
   * Saleor's URL transformations and focusing on actual content differences.
   */
  private resolveExistingMediaSourceUrl(media: ProductMedia): string {
    const metadataSource = extractSourceUrlFromMetadata(media.metadata);
    if (metadataSource) {
      const normalized = this.normalizeExternalMediaUrl(metadataSource);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    return media.url.trim();
  }

  private areMediaArraysEquivalent(
    desired: Array<{ externalUrl: string; alt?: string }>,
    existing: ProductMedia[]
  ): boolean {
    // Quick count check
    if (desired.length !== existing.length) {
      return false;
    }

    // If both are empty, they're equivalent
    if (desired.length === 0) {
      return true;
    }

    // Create fingerprint maps for comparison
    const desiredFingerprints = new Map<string, { alt?: string }>();
    for (const media of desired) {
      const fingerprint = this.extractMediaFingerprint(media.externalUrl);
      desiredFingerprints.set(fingerprint, { alt: media.alt?.trim() || undefined });
    }

    const existingFingerprints = new Map<string, { alt?: string }>();
    for (const media of existing) {
      const sourceUrl = this.resolveExistingMediaSourceUrl(media);
      const fingerprint = this.extractMediaFingerprint(sourceUrl);
      existingFingerprints.set(fingerprint, { alt: media.alt?.trim() || undefined });
    }

    // Compare fingerprints and alt text
    if (desiredFingerprints.size !== existingFingerprints.size) {
      return false;
    }

    for (const [fingerprint, desiredMeta] of desiredFingerprints) {
      const existingMeta = existingFingerprints.get(fingerprint);
      if (!existingMeta) {
        return false; // Missing media
      }

      // Compare alt text
      if (desiredMeta.alt !== existingMeta.alt) {
        return false; // Alt text differs
      }
    }

    return true;
  }

  private async syncProductMedia(
    product: Product,
    mediaInputs: ProductMediaInput[] = []
  ): Promise<void> {
    const productReference =
      typeof (product as Product & { slug?: string }).slug === "string"
        ? ((product as Product & { slug?: string }).slug ?? product.id)
        : product.id;

    logger.debug("Syncing product media", {
      productReference,
      mediaInputCount: mediaInputs.length,
    });

    // Filter valid media inputs and normalize URLs
    const desiredMedia = mediaInputs
      .filter(
        (media) => typeof media.externalUrl === "string" && media.externalUrl.trim().length > 0
      )
      .map((media) => ({
        ...media,
        externalUrl: this.normalizeExternalMediaUrl(media.externalUrl),
      }));

    // Deduplicate by URL (keep first occurrence)
    const processedUrls = new Set<string>();
    const uniqueMedia = desiredMedia.filter((media) => {
      if (processedUrls.has(media.externalUrl)) {
        return false;
      }
      processedUrls.add(media.externalUrl);
      return true;
    });

    // Fetch existing media to compare intelligently
    const existingMedia = await ServiceErrorWrapper.wrapServiceCall(
      "fetch existing product media for comparison",
      "product media",
      productReference,
      async () => this.repository.listProductMedia(product.id),
      ProductError
    );

    // Check if media is functionally equivalent (accounts for Saleor URL transformations)
    const isEquivalent = this.areMediaArraysEquivalent(uniqueMedia, existingMedia);

    if (isEquivalent) {
      logger.debug("Product media is functionally equivalent, skipping update", {
        productReference,
        desiredCount: uniqueMedia.length,
        existingCount: existingMedia.length,
      });
      return; // No changes needed
    }

    logger.debug("Product media differs, performing replacement", {
      productReference,
      desiredCount: uniqueMedia.length,
      existingCount: existingMedia.length,
    });

    // Convert to ProductMediaCreateInput format
    const createMediaInputs: ProductMediaCreateInput[] = uniqueMedia.map((media) => {
      const input: ProductMediaCreateInput = {
        product: product.id,
        mediaUrl: media.externalUrl,
      };

      if (typeof media.alt === "string") {
        input.alt = media.alt;
      }

      return input;
    });

    // Use the new replaceAllProductMedia method to ensure complete replacement
    await ServiceErrorWrapper.wrapServiceCall(
      "replace all product media",
      "product media",
      productReference,
      async () => this.repository.replaceAllProductMedia(product.id, createMediaInputs),
      ProductError
    );

    logger.debug("Product media sync completed", {
      productReference,
      replacedMediaCount: createMediaInputs.length,
    });
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
        if (updateProductInput.description && /description|json|string/i.test(msg)) {
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

  /**
   * Extracts unique references from product inputs
   * Follows Single Responsibility Principle - only handles extraction logic
   *
   * @param products - Array of product inputs
   * @returns Object containing unique product types, categories, and channels
   */
  private extractUniqueReferences(products: ProductInput[]): {
    productTypes: Set<string>;
    categories: Set<string>;
    channels: Set<string>;
  } {
    const productTypes = new Set<string>();
    const categories = new Set<string>();
    const channels = new Set<string>();

    for (const product of products) {
      productTypes.add(product.productType);

      if (product.category) {
        categories.add(product.category);
      }

      // Extract channels from product listings
      if (product.channelListings) {
        for (const listing of product.channelListings) {
          channels.add(listing.channel);
        }
      }

      // Extract channels from variant listings
      if (product.variants) {
        for (const variant of product.variants) {
          if (variant.channelListings) {
            for (const listing of variant.channelListings) {
              channels.add(listing.channel);
            }
          }
        }
      }
    }

    return { productTypes, categories, channels };
  }

  /**
   * Pre-resolves a set of product type references to warm the cache
   * Follows Single Responsibility Principle - only handles product type pre-caching
   *
   * @param productTypes - Set of product type names to resolve
   */
  private async preCacheProductTypes(productTypes: Set<string>): Promise<void> {
    if (productTypes.size === 0) return;

    logger.debug(`Pre-resolving ${productTypes.size} product types`);

    for (const productType of productTypes) {
      try {
        await this.resolveProductTypeReference(productType);
      } catch (error) {
        logger.warn(`Failed to pre-cache product type: ${productType}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Pre-resolves a set of category references to warm the cache
   * Follows Single Responsibility Principle - only handles category pre-caching
   *
   * @param categories - Set of category slugs to resolve
   */
  private async preCacheCategories(categories: Set<string>): Promise<void> {
    if (categories.size === 0) return;

    logger.debug(`Pre-resolving ${categories.size} categories`);

    for (const category of categories) {
      try {
        await this.resolveCategoryReference(category);
      } catch (error) {
        logger.warn(`Failed to pre-cache category: ${category}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Pre-resolves a set of channel references to warm the cache
   * Follows Single Responsibility Principle - only handles channel pre-caching
   *
   * @param channels - Set of channel slugs to resolve
   */
  private async preCacheChannels(channels: Set<string>): Promise<void> {
    if (channels.size === 0) return;

    logger.debug(`Pre-resolving ${channels.size} channels`);

    for (const channel of channels) {
      try {
        await this.resolveChannelReference(channel);
      } catch (error) {
        logger.warn(`Failed to pre-cache channel: ${channel}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Pre-caches all references used by products to avoid rate limiting
   * Coordinates the pre-caching of product types, categories, and channels
   *
   * @param products - Array of product inputs to extract references from
   */
  private async preCacheProductReferences(products: ProductInput[]): Promise<void> {
    logger.debug("Pre-caching references to avoid rate limiting");

    const { productTypes, categories, channels } = this.extractUniqueReferences(products);

    // Pre-resolve all references in parallel for better performance
    await Promise.all([
      this.preCacheProductTypes(productTypes),
      this.preCacheCategories(categories),
      this.preCacheChannels(channels),
    ]);

    logger.debug("Reference pre-caching completed", {
      productTypesCount: productTypes.size,
      categoriesCount: categories.size,
      channelsCount: channels.size,
    });
  }

  /**
   * Bootstrap multiple products using bulk mutations for improved performance
   * Uses bulk operations to reduce API calls and avoid rate limiting
   */
  async bootstrapProductsBulk(products: ProductInput[]): Promise<void> {
    logger.info(`Bootstrapping ${products.length} products via bulk operations`);

    // Step 1: Fetch existing products to determine create vs update
    const existingProductsMap = new Map<string, Product>();
    const slugs = products.map((p) => p.slug);

    // Fetch existing products using bulk query for better performance
    const existingProducts = await this.repository.getProductsBySlugs(slugs);

    // Map existing products by slug for quick lookup
    existingProducts.forEach((product) => {
      if (product?.slug) {
        existingProductsMap.set(product.slug, product);
      }
    });

    // Step 2: Separate into create and update buckets
    const toCreate: ProductInput[] = [];
    const toUpdate: Array<{ existing: Product; input: ProductInput }> = [];

    for (const productInput of products) {
      const existing = existingProductsMap.get(productInput.slug);
      if (existing) {
        toUpdate.push({ existing, input: productInput });
      } else {
        toCreate.push(productInput);
      }
    }

    // Step 2.5: Pre-cache all references to avoid rate limiting during loops
    await this.preCacheProductReferences(products);

    logger.info(`Products to create: ${toCreate.length}, to update: ${toUpdate.length}`);

    const allFailures: Array<{ entity: string; error: Error }> = [];
    const createdProducts: Product[] = [];
    const updatedProducts: Product[] = [];

    // Step 3: Bulk create new products (without variants initially)
    if (toCreate.length > 0) {
      logger.info(`Creating ${toCreate.length} new products via bulk mutation`);

      try {
        // Prepare bulk create inputs
        const createInputs = await Promise.all(
          toCreate.map(async (productInput) => {
            const productTypeId = await this.resolveProductTypeReference(productInput.productType);
            const categoryId = productInput.category
              ? await this.resolveCategoryReference(productInput.category)
              : undefined;
            const attributes = productInput.attributes
              ? await this.resolveAttributeValues(productInput.attributes)
              : [];

            const input: ProductCreateInput = {
              name: productInput.name,
              slug: productInput.slug,
              description: productInput.description,
              productType: productTypeId,
              category: categoryId,
              attributes,
            };

            return input;
          })
        );

        // Execute bulk create
        const createResult = await this.repository.bulkCreateProducts({
          products: createInputs,
          errorPolicy: "IGNORE_FAILED",
        });

        // Process results
        if (createResult.results) {
          createResult.results.forEach(({ product, errors }, index) => {
            if (errors && errors.length > 0) {
              allFailures.push({
                entity: toCreate[index].name,
                error: new Error(errors.map((e) => `${e.path || ""}: ${e.message}`).join(", ")),
              });
              logger.warn(`Failed to create product: ${toCreate[index].name}`, { errors });
            } else if (product) {
              createdProducts.push(product);
            }
          });
        }

        // Log global errors if any
        if (createResult.errors && createResult.errors.length > 0) {
          logger.warn("Global errors during bulk product creation", {
            errors: createResult.errors,
          });
        }
      } catch (error) {
        logger.error("Failed to bulk create products", { error });
        toCreate.forEach((p) => {
          allFailures.push({
            entity: p.name,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        });
      }
    }

    // Step 4: Update existing products individually (no bulk update for products)
    // Note: productBulkUpdate doesn't exist in Saleor, so we update sequentially
    for (const { existing, input } of toUpdate) {
      try {
        const categoryId = input.category
          ? await this.resolveCategoryReference(input.category)
          : undefined;
        const attributes = input.attributes
          ? await this.resolveAttributeValues(input.attributes)
          : [];

        const updateInput: ProductUpdateInput = {
          name: input.name,
          slug: input.slug,
          description: input.description,
          category: categoryId,
          attributes,
        };

        const updated = await this.repository.updateProduct(existing.id, updateInput);
        updatedProducts.push(updated);
      } catch (error) {
        allFailures.push({
          entity: input.name,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        logger.warn(`Failed to update product: ${input.name}`, { error });
      }
    }

    // Step 5: Collect all variants from all products (created and updated)
    const allProducts = [...createdProducts, ...updatedProducts];
    const allVariants: Array<{
      productId: string;
      productInput: ProductInput;
      variantInput: ProductVariantInput;
    }> = [];

    for (const productInput of products) {
      const product = allProducts.find((p) => p.slug === productInput.slug);
      if (product?.id && productInput.variants && productInput.variants.length > 0) {
        for (const variantInput of productInput.variants) {
          allVariants.push({ productId: product.id, productInput, variantInput });
        }
      }
    }

    // Step 6: Bulk create all variants (grouped by product - API requires one product per call)
    if (allVariants.length > 0) {
      logger.info(`Creating ${allVariants.length} variants via bulk mutation`);

      // Group variants by product ID (bulk create requires one product per call)
      const variantsByProduct = new Map<
        string,
        Array<{ productInput: (typeof allVariants)[0]["productInput"]; variantInput: (typeof allVariants)[0]["variantInput"] }>
      >();
      for (const { productId, productInput, variantInput } of allVariants) {
        if (!variantsByProduct.has(productId)) {
          variantsByProduct.set(productId, []);
        }
        variantsByProduct.get(productId)!.push({ productInput, variantInput });
      }

      // Process each product's variants
      for (const [productId, variants] of variantsByProduct) {
        try {
          // Prepare variant inputs (without product field - it goes at mutation level)
          const variantInputs = await Promise.all(
            variants.map(async ({ variantInput }) => {
              const attributes = variantInput.attributes
                ? await this.resolveAttributeValues(variantInput.attributes)
                : [];

              return {
                name: variantInput.name,
                sku: variantInput.sku,
                trackInventory: true,
                weight: variantInput.weight,
                attributes,
              };
            })
          );

          // Execute bulk variant create with product ID at top level
          const variantResult = await this.repository.bulkCreateVariants({
            product: productId,
            variants: variantInputs,
            errorPolicy: "IGNORE_FAILED",
          });

          // Process variant results
          if (variantResult.results) {
            variantResult.results.forEach(({ errors }, index) => {
              if (errors && errors.length > 0) {
                const variant = variants[index];
                logger.warn(
                  `Failed to create variant ${variant.variantInput.sku} for product ${variant.productInput.name}`,
                  { errors }
                );
              }
            });
          }

          // Update channel listings for variants (no bulk API available)
          if (variantResult.results) {
            await Promise.all(
              variantResult.results.map(async ({ productVariant }, index) => {
                if (!productVariant) return;

                const variant = variants[index];
                const channelListings = variant.variantInput.channelListings;

                if (channelListings && channelListings.length > 0) {
                  try {
                    const channelInputs = await Promise.all(
                      channelListings.map(async (listing) => ({
                        channelId: await this.resolveChannelReference(listing.channel),
                        price: listing.price,
                        costPrice: listing.costPrice,
                      }))
                    );

                    await this.repository.updateProductVariantChannelListings(
                      productVariant.id,
                      channelInputs
                    );
                  } catch (error) {
                    logger.warn(
                      `Failed to update channel listings for variant ${productVariant.sku}`,
                      { error }
                    );
                  }
                }
              })
            );
          }
        } catch (error) {
          logger.error(`Failed to bulk create variants for product ${productId}`, { error });
          variants.forEach((v) => {
            allFailures.push({
              entity: `${v.productInput.name} - ${v.variantInput.sku}`,
              error: error instanceof Error ? error : new Error(String(error)),
            });
          });
        }
      }
    }

    // Step 7: Handle media and channel listings for products (no bulk APIs)
    // These operations must be done individually
    const allProductInputs = [...toCreate, ...toUpdate.map((u) => u.input)];

    await Promise.all(
      allProductInputs.map(async (productInput) => {
        const product = allProducts.find((p) => p.slug === productInput.slug);
        if (!product) return;

        // Sync media
        if (productInput.media !== undefined) {
          try {
            await this.syncProductMedia(product, productInput.media);
          } catch (error) {
            logger.warn(`Failed to sync media for product ${productInput.name}`, { error });
          }
        }

        // Update channel listings
        if (productInput.channelListings && productInput.channelListings.length > 0) {
          try {
            const channelInputs = await Promise.all(
              productInput.channelListings.map(async (listing) => ({
                channelId: await this.resolveChannelReference(listing.channel),
                isPublished: listing.isPublished ?? false,
                publishedAt: listing.publishedAt,
                visibleInListings: listing.visibleInListings ?? false,
                isAvailableForPurchase: listing.isAvailableForPurchase,
                availableForPurchaseAt: listing.availableForPurchaseAt,
              }))
            );

            await this.repository.updateProductChannelListings(product.id, {
              updateChannels: channelInputs,
            });
          } catch (error) {
            logger.warn(`Failed to update channel listings for product ${productInput.name}`, {
              error,
            });
          }
        }
      })
    );

    // Step 8: Report results
    if (allFailures.length > 0) {
      const errorMessage = `Failed to bootstrap ${allFailures.length} of ${products.length} products`;
      logger.error(errorMessage, { failures: allFailures });
      throw new ProductError(errorMessage);
    }

    logger.info("Successfully bootstrapped all products via bulk operations", {
      total: products.length,
      created: createdProducts.length,
      updated: updatedProducts.length,
      variants: allVariants.length,
    });
  }
}
