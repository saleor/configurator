import { logger } from "../../lib/logger";
import type { TranslationRepository } from "./repository";
import type { ProductService } from "../product/product-service";
import type { CollectionService } from "../collection/collection-service";
import type { CategoryService } from "../category/category-service";
import type { PageService } from "../page/page-service";
import type { ShippingService } from "../shipping/shipping-service";
import type { MenuService } from "../menu/menu-service";
import type { AttributeService } from "../attribute/attribute-service";

export interface EntityTranslation {
  entityType: "product" | "collection" | "category" | "variant" | "page" | "shipping" | "menuItem" | "attribute" | "attributeValue";
  entityIdentifier: string; // slug or name depending on entity
  languageCode: string;
  translations: {
    name?: string;
    title?: string;
    description?: string;
    content?: string;
    seoTitle?: string;
    seoDescription?: string;
    richText?: string;
    plainText?: string;
  };
}

export class TranslationService {
  constructor(
    private readonly repository: TranslationRepository,
    private readonly productService: ProductService,
    private readonly collectionService: CollectionService,
    private readonly categoryService: CategoryService,
    private readonly pageService: PageService,
    private readonly shippingService: ShippingService,
    private readonly menuService: MenuService,
    private readonly attributeService: AttributeService
  ) {}

  async applyTranslations(translations: EntityTranslation[]) {
    logger.info(`Applying ${translations.length} translations`);
    
    const results = [];
    const groupedTranslations = this.groupTranslationsByType(translations);
    
    // Process each entity type
    for (const [entityType, entityTranslations] of Object.entries(groupedTranslations)) {
      logger.debug(`Processing ${entityTranslations.length} ${entityType} translations`);
      
      try {
        switch (entityType) {
          case "product":
            results.push(...await this.translateProducts(entityTranslations));
            break;
          case "collection":
            results.push(...await this.translateCollections(entityTranslations));
            break;
          case "category":
            results.push(...await this.translateCategories(entityTranslations));
            break;
          case "variant":
            results.push(...await this.translateProductVariants(entityTranslations));
            break;
          case "page":
            results.push(...await this.translatePages(entityTranslations));
            break;
          case "shipping":
            results.push(...await this.translateShippingMethods(entityTranslations));
            break;
          case "menuItem":
            results.push(...await this.translateMenuItems(entityTranslations));
            break;
          case "attribute":
            results.push(...await this.translateAttributes(entityTranslations));
            break;
          case "attributeValue":
            results.push(...await this.translateAttributeValues(entityTranslations));
            break;
          default:
            logger.warn(`Unknown entity type: ${entityType}`);
        }
      } catch (error) {
        logger.error(`Failed to translate ${entityType} entities`, { error });
        throw error;
      }
    }
    
    return results;
  }

  private groupTranslationsByType(translations: EntityTranslation[]) {
    return translations.reduce((acc, translation) => {
      if (!acc[translation.entityType]) {
        acc[translation.entityType] = [];
      }
      acc[translation.entityType].push(translation);
      return acc;
    }, {} as Record<string, EntityTranslation[]>);
  }

  private async translateProducts(translations: EntityTranslation[]) {
    const products = await this.productService.getProducts();
    const productMap = new Map(products.map(p => [p.slug, p]));
    
    const results = [];
    for (const translation of translations) {
      const product = productMap.get(translation.entityIdentifier);
      if (!product) {
        logger.warn(`Product not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
        description: translation.translations.description,
        seoTitle: translation.translations.seoTitle,
        seoDescription: translation.translations.seoDescription,
      };
      
      const result = await this.repository.translateProduct(
        product.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateCollections(translations: EntityTranslation[]) {
    const collections = await this.collectionService.getCollections();
    const collectionMap = new Map(collections.map(c => [c.slug, c]));
    
    const results = [];
    for (const translation of translations) {
      const collection = collectionMap.get(translation.entityIdentifier);
      if (!collection) {
        logger.warn(`Collection not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
        description: translation.translations.description,
        seoTitle: translation.translations.seoTitle,
        seoDescription: translation.translations.seoDescription,
      };
      
      const result = await this.repository.translateCollection(
        collection.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateCategories(translations: EntityTranslation[]) {
    const categories = await this.categoryService.getCategories();
    const categoryMap = new Map(categories.map(c => [c.slug, c]));
    
    const results = [];
    for (const translation of translations) {
      const category = categoryMap.get(translation.entityIdentifier);
      if (!category) {
        logger.warn(`Category not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
        description: translation.translations.description,
        seoTitle: translation.translations.seoTitle,
        seoDescription: translation.translations.seoDescription,
      };
      
      const result = await this.repository.translateCategory(
        category.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateProductVariants(translations: EntityTranslation[]) {
    const products = await this.productService.getProducts();
    const variantMap = new Map();
    
    // Build variant map
    for (const product of products) {
      if (product.variants) {
        for (const variant of product.variants) {
          variantMap.set(variant.sku, variant);
        }
      }
    }
    
    const results = [];
    for (const translation of translations) {
      const variant = variantMap.get(translation.entityIdentifier);
      if (!variant) {
        logger.warn(`Product variant not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
      };
      
      const result = await this.repository.translateProductVariant(
        variant.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translatePages(translations: EntityTranslation[]) {
    const pages = await this.pageService.getPages();
    const pageMap = new Map(pages.map(p => [p.slug, p]));
    
    const results = [];
    for (const translation of translations) {
      const page = pageMap.get(translation.entityIdentifier);
      if (!page) {
        logger.warn(`Page not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        title: translation.translations.title,
        content: translation.translations.content,
        seoTitle: translation.translations.seoTitle,
        seoDescription: translation.translations.seoDescription,
      };
      
      const result = await this.repository.translatePage(
        page.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateShippingMethods(translations: EntityTranslation[]) {
    const shippingZones = await this.shippingService.getShippingZones();
    const shippingMethodMap = new Map();
    
    // Build shipping method map
    for (const zone of shippingZones) {
      if (zone.shippingMethods) {
        for (const method of zone.shippingMethods) {
          shippingMethodMap.set(method.name, method);
        }
      }
    }
    
    const results = [];
    for (const translation of translations) {
      const method = shippingMethodMap.get(translation.entityIdentifier);
      if (!method) {
        logger.warn(`Shipping method not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
        description: translation.translations.description,
      };
      
      const result = await this.repository.translateShippingMethod(
        method.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateMenuItems(translations: EntityTranslation[]) {
    const menus = await this.menuService.getMenus();
    const menuItemMap = new Map();
    
    // Build menu item map
    function collectMenuItems(items: any[], map: Map<string, any>) {
      for (const item of items) {
        map.set(item.name, item);
        if (item.children?.length) {
          collectMenuItems(item.children, map);
        }
      }
    }
    
    for (const menu of menus) {
      if (menu.items) {
        collectMenuItems(menu.items, menuItemMap);
      }
    }
    
    const results = [];
    for (const translation of translations) {
      const menuItem = menuItemMap.get(translation.entityIdentifier);
      if (!menuItem) {
        logger.warn(`Menu item not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
      };
      
      const result = await this.repository.translateMenuItem(
        menuItem.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateAttributes(translations: EntityTranslation[]) {
    const attributes = await this.attributeService.getAttributes();
    const attributeMap = new Map(attributes.map(a => [a.slug, a]));
    
    const results = [];
    for (const translation of translations) {
      const attribute = attributeMap.get(translation.entityIdentifier);
      if (!attribute) {
        logger.warn(`Attribute not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
      };
      
      const result = await this.repository.translateAttribute(
        attribute.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  private async translateAttributeValues(translations: EntityTranslation[]) {
    const attributes = await this.attributeService.getAttributes();
    const attributeValueMap = new Map();
    
    // Build attribute value map
    for (const attribute of attributes) {
      if (attribute.values) {
        for (const value of attribute.values) {
          // Use combination of attribute slug and value slug as key
          const key = `${attribute.slug}:${value.slug}`;
          attributeValueMap.set(key, value);
        }
      }
    }
    
    const results = [];
    for (const translation of translations) {
      const attributeValue = attributeValueMap.get(translation.entityIdentifier);
      if (!attributeValue) {
        logger.warn(`Attribute value not found: ${translation.entityIdentifier}`);
        continue;
      }
      
      const input = {
        name: translation.translations.name,
        richText: translation.translations.richText,
        plainText: translation.translations.plainText,
      };
      
      const result = await this.repository.translateAttributeValue(
        attributeValue.id,
        translation.languageCode,
        input
      );
      results.push(result);
    }
    
    return results;
  }

  async getTranslations(entityType: string, entityId: string, languageCode: string) {
    logger.debug(`Fetching translations for ${entityType} ${entityId} in ${languageCode}`);
    
    // This method would typically fetch translations from the API
    // For now, it's a placeholder
    throw new Error("Not implemented yet");
  }
} 