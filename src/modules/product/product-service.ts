import type { 
  ProductInput, 
  ProductVariantInput
} from "../config/schema";
import { logger } from "../../lib/logger";
import type { ProductOperations, Product, ProductVariant } from "./repository";

export class ProductService {
  constructor(private repository: ProductOperations) {}

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

  // Temporarily removed channel resolution
  // TODO: Add back in separate commit when implementing channel listings

  // Temporarily removed channel listings resolution
  // TODO: Add back in separate commit

  // Temporarily removed variant channel listings resolution
  // TODO: Add back in separate commit

  private async upsertProduct(productInput: ProductInput): Promise<Product> {
    logger.debug("Looking up existing product", { name: productInput.name });
    
    const existingProduct = await this.repository.getProductByName(productInput.name);
    if (existingProduct) {
      logger.debug("Found existing product", {
        id: existingProduct.id,
        name: existingProduct.name,
      });
      return existingProduct;
    }

    logger.debug("Creating new product", { name: productInput.name });

    // Resolve references
    const productTypeId = await this.resolveProductTypeReference(productInput.productType);
    const categoryId = await this.resolveCategoryReference(productInput.category);

    // Create product
    const slug = productInput.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const product = await this.repository.createProduct({
      name: productInput.name,
      slug: slug,
      productType: productTypeId,
      category: categoryId,
      // TODO: Handle description (needs JSONString format for rich text)
      // TODO: Handle attributes in future iteration
      // TODO: Handle channel listings in separate commit
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
            sku: variantInput.sku 
          });
          
          // Update existing variant (note: can't change product association during update)
          variant = await this.repository.updateProductVariant(existingVariant.id, {
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: [], // Required field but can be empty
            // TODO: Handle channelListings in separate commit
          });
          
          logger.info("Updated existing product variant", {
            variantId: variant.id,
            name: variant.name,
            sku: variant.sku,
          });
        } else {
          logger.debug("Creating new variant", { sku: variantInput.sku });
          
          // Create new variant
          variant = await this.repository.createProductVariant({
            product: product.id,
            name: variantInput.name,
            sku: variantInput.sku,
            trackInventory: true,
            weight: variantInput.weight,
            attributes: [], // Required field but can be empty
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
      const product = await this.upsertProduct(productInput);

      // 2. Create variants
      const variants = await this.createProductVariants(product, productInput.variants);

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

    // Process products sequentially to handle potential cross-references
    for (const productInput of products) {
      await this.bootstrapProduct(productInput);
    }

    logger.info("Successfully bootstrapped all products", { count: products.length });
  }
}