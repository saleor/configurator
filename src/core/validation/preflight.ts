import { Console } from "../../cli/console";
import type {
  CategoryInput,
  ChannelInput,
  CollectionInput,
  MenuInput,
  ModelInput,
  PageTypeInput,
  ProductInput,
  ProductTypeInput,
  SaleorConfig,
  ShippingZoneInput,
  TaxClassInput,
  WarehouseInput,
} from "../../modules/config/schema/schema";
import { validateNoInlineDefinitions } from "../../modules/config/validation/inline-attribute-validator";
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
  checkDuplicates<WarehouseInput>("warehouses", config.warehouses, (w) => w.slug, "warehouse slug");
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

/**
 * Validates that no inline attribute definitions exist in productTypes or modelTypes.
 * Throws with clear error messages and migration guidance if violations are found.
 */
export function validateNoInlineAttributeDefinitions(config: SaleorConfig, filePath: string): void {
  const errors = validateNoInlineDefinitions(config);
  if (errors.length === 0) return;

  // Display errors using cliConsole for user-friendly output
  const cliConsole = new Console();

  for (const error of errors) {
    cliConsole.error(error.message);

    // Display migration box with suggestions
    const suggestions = error.getRecoverySuggestions();
    cliConsole.box(["Migration Required", "", ...suggestions.map((s) => `• ${s}`)], "How to Fix");
  }

  // Throw a validation error to halt deployment
  throw new ConfigurationValidationError(
    "Inline attribute definitions are no longer supported",
    filePath,
    errors.map((e) => ({
      path: e.entityType,
      message: e.message,
    }))
  );
}

/**
 * Run all preflight validations on the configuration.
 * This should be called early in the deployment pipeline.
 */
export function runPreflightValidation(config: SaleorConfig, filePath: string): void {
  // Check for duplicate identifiers
  validateNoDuplicateIdentifiers(config, filePath);

  // Check for inline attribute definitions (migration validation)
  validateNoInlineAttributeDefinitions(config, filePath);
}
