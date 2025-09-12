import type {
  SaleorConfig,
  ChannelInput,
  WarehouseInput,
  ShippingZoneInput,
  ProductTypeInput,
  PageTypeInput,
  CategoryInput,
  ProductInput,
  CollectionInput,
  MenuInput,
  ModelInput,
  TaxClassInput,
} from "../../modules/config/schema/schema";
import { ConfigurationValidationError } from "../errors/configuration-errors";

type EntityArrayKey =
  | "channels"
  | "warehouses"
  | "shippingZones"
  | "productTypes"
  | "pageTypes"
  | "categories"
  | "products"
  | "collections"
  | "menus"
  | "models"
  | "taxClasses";

export interface DuplicateIssue {
  section: EntityArrayKey;
  identifier: string;
  count: number;
  label: string;
}

/**
 * Preflight validation scanning for duplicate identifiers across key entities.
 * Throws a ConfigurationValidationError with a friendly list if duplicates are found.
 */
export function scanForDuplicateIdentifiers(config: SaleorConfig): DuplicateIssue[] {
  const issues: DuplicateIssue[] = [];

  const checkDuplicates = <T>(
    key: EntityArrayKey,
    arr: readonly T[] | undefined,
    getId: (item: T) => string | undefined,
    label: string
  ) => {
    if (!Array.isArray(arr) || arr.length === 0) return;
    const seen = new Map<string, number>();
    for (const item of arr) {
      const id = getId(item);
      if (!id) continue;
      const count = seen.get(id) || 0;
      seen.set(id, count + 1);
    }
    for (const [id, count] of seen) {
      if (count > 1) {
        issues.push({ section: key, identifier: id, count, label });
      }
    }
  };

  checkDuplicates<ChannelInput>("channels", config.channels, (c) => c.slug, "channel slug");
  checkDuplicates<WarehouseInput>(
    "warehouses",
    config.warehouses,
    (w) => w.slug,
    "warehouse slug"
  );
  checkDuplicates<ShippingZoneInput>(
    "shippingZones",
    config.shippingZones,
    (z) => z.name,
    "shipping zone name"
  );
  checkDuplicates<ProductTypeInput>(
    "productTypes",
    config.productTypes,
    (t) => t.name,
    "product type name"
  );
  checkDuplicates<PageTypeInput>("pageTypes", config.pageTypes, (t) => t.name, "page type name");
  checkDuplicates<CategoryInput>("categories", config.categories, (c) => c.slug, "category slug");
  checkDuplicates<ProductInput>("products", config.products, (p) => p.slug, "product slug");
  // Optional others
  checkDuplicates<MenuInput>(
    "menus",
    config.menus,
    (m) => (m as { slug?: string; name?: string }).slug || (m as { name?: string }).name || "",
    "menu identifier"
  );
  checkDuplicates<CollectionInput>(
    "collections",
    config.collections,
    (c) => c.slug,
    "collection slug"
  );
  checkDuplicates<ModelInput>(
    "models",
    config.models,
    (m) => (m as { slug?: string; name?: string }).slug || (m as { name?: string }).name || "",
    "model identifier"
  );
  checkDuplicates<TaxClassInput>("taxClasses", config.taxClasses, (t) => t.name, "tax class name");

  return issues;
}

export function validateNoDuplicateIdentifiers(config: SaleorConfig, filePath: string): void {
  const issues = scanForDuplicateIdentifiers(config);
  if (issues.length === 0) return;
  throw new ConfigurationValidationError(
    "Duplicate entity identifiers found in configuration",
    filePath,
    issues.map((i) => ({
      path: i.section,
      message: `Duplicate ${i.label} '${i.identifier}' found ${i.count} times. Ensure it is unique.`,
    }))
  );
}
