import type { SaleorConfig } from "../../modules/config/schema/schema";
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

  checkDuplicates("channels", config.channels, (c: any) => c?.slug, "channel slug");
  checkDuplicates("warehouses", config.warehouses, (w: any) => w?.slug, "warehouse slug");
  checkDuplicates("shippingZones", config.shippingZones, (z: any) => z?.name, "shipping zone name");
  checkDuplicates("productTypes", config.productTypes, (t: any) => t?.name, "product type name");
  checkDuplicates("pageTypes", config.pageTypes, (t: any) => t?.name, "page type name");
  checkDuplicates("categories", config.categories, (c: any) => c?.slug, "category slug");
  checkDuplicates("products", config.products, (p: any) => p?.slug, "product slug");
  // Optional others
  checkDuplicates("menus", config.menus as any, (m: any) => m?.slug || m?.name, "menu identifier");
  checkDuplicates("collections", config.collections as any, (c: any) => c?.slug, "collection slug");
  checkDuplicates("models", config.models as any, (m: any) => m?.slug || m?.name, "model identifier");
  checkDuplicates("taxClasses", config.taxClasses as any, (t: any) => t?.name, "tax class name");

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
