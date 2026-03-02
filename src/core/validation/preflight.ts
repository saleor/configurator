import type {
  ContentAttribute,
  ProductAttribute,
} from "../../modules/config/schema/global-attributes.schema";
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

const ENTITY_SECTIONS = [
  "channels",
  "warehouses",
  "shippingZones",
  "productTypes",
  "pageTypes",
  "categories",
  "products",
  "collections",
  "menus",
  "models",
  "taxClasses",
  "productAttributes",
  "contentAttributes",
] as const;

type EntityArrayKey = (typeof ENTITY_SECTIONS)[number];

export function isEntitySection(value: string): value is EntityArrayKey {
  return (ENTITY_SECTIONS as readonly string[]).includes(value);
}

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
      const count = seen.get(id) ?? 0;
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
  checkDuplicates<MenuInput>(
    "menus",
    config.menus,
    (m) => (m as { slug?: string; name?: string }).slug ?? (m as { name?: string }).name,
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
    (m) => (m as { slug?: string; name?: string }).slug ?? (m as { name?: string }).name,
    "model identifier"
  );
  checkDuplicates<TaxClassInput>("taxClasses", config.taxClasses, (t) => t.name, "tax class name");
  checkDuplicates<ProductAttribute>(
    "productAttributes",
    config.productAttributes,
    (a) => a.name,
    "product attribute name"
  );
  checkDuplicates<ContentAttribute>(
    "contentAttributes",
    config.contentAttributes,
    (a) => a.name,
    "content attribute name"
  );

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

  throw new ConfigurationValidationError(
    "Inline attribute definitions are no longer supported",
    filePath,
    errors.flatMap((e) => [
      { path: e.entityType, message: e.message },
      ...e.getRecoverySuggestions().map((s) => ({ path: e.entityType, message: `Fix: ${s}` })),
    ])
  );
}

/**
 * Validates that no attribute name appears in both productAttributes and contentAttributes.
 * Each attribute must exist in only one section.
 */
export function validateNoCrossSectionDuplicates(config: SaleorConfig, filePath: string): void {
  const productNames = new Set((config.productAttributes ?? []).map((a) => a.name));
  const crossDupes = (config.contentAttributes ?? [])
    .filter((a) => productNames.has(a.name))
    .map((a) => a.name);

  if (crossDupes.length > 0) {
    throw new ConfigurationValidationError(
      "Attribute names must be unique across productAttributes and contentAttributes",
      filePath,
      crossDupes.map((name) => ({
        path: "productAttributes/contentAttributes",
        message: `"${name}" appears in both productAttributes and contentAttributes. Each attribute must exist in only one section.`,
      }))
    );
  }
}

/**
 * Validates that all attribute references in productTypes, pageTypes, and modelTypes
 * point to attributes that exist in the corresponding global section.
 */
export function validateAttributeReferences(config: SaleorConfig, filePath: string): void {
  const productAttrNames = new Set((config.productAttributes ?? []).map((a) => a.name));
  const contentAttrNames = new Set((config.contentAttributes ?? []).map((a) => a.name));

  if (productAttrNames.size === 0 && contentAttrNames.size === 0) return;

  const errors: Array<{ path: string; message: string }> = [];

  for (const pt of config.productTypes ?? []) {
    for (const ref of [...(pt.productAttributes ?? []), ...(pt.variantAttributes ?? [])]) {
      if ("attribute" in ref && !productAttrNames.has(ref.attribute)) {
        errors.push({
          path: `productTypes.${pt.name}`,
          message: `References attribute "${ref.attribute}" which does not exist in productAttributes`,
        });
      }
    }
  }

  for (const pt of config.pageTypes ?? []) {
    if ("attributes" in pt) {
      for (const ref of pt.attributes ?? []) {
        if ("attribute" in ref && !contentAttrNames.has(ref.attribute)) {
          errors.push({
            path: `pageTypes.${pt.name}`,
            message: `References attribute "${ref.attribute}" which does not exist in contentAttributes`,
          });
        }
      }
    }
  }

  for (const mt of config.modelTypes ?? []) {
    for (const ref of mt.attributes ?? []) {
      if ("attribute" in ref && !contentAttrNames.has(ref.attribute)) {
        errors.push({
          path: `modelTypes.${mt.name}`,
          message: `References attribute "${ref.attribute}" which does not exist in contentAttributes`,
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new ConfigurationValidationError("Unresolved attribute references", filePath, errors);
  }
}

/**
 * Run all preflight validations on the configuration.
 * Collects all validation errors before throwing to give the user a complete picture.
 */
export function runPreflightValidation(config: SaleorConfig, filePath: string): void {
  const errors: ConfigurationValidationError[] = [];

  try {
    validateNoDuplicateIdentifiers(config, filePath);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      errors.push(error);
    } else {
      throw error;
    }
  }

  try {
    validateNoCrossSectionDuplicates(config, filePath);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      errors.push(error);
    } else {
      throw error;
    }
  }

  try {
    validateNoInlineAttributeDefinitions(config, filePath);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      errors.push(error);
    } else {
      throw error;
    }
  }

  try {
    validateAttributeReferences(config, filePath);
  } catch (error) {
    if (error instanceof ConfigurationValidationError) {
      errors.push(error);
    } else {
      throw error;
    }
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    const allValidationErrors = errors.flatMap((e) => e.validationErrors);
    throw new ConfigurationValidationError(
      `Multiple validation errors found (${errors.length} checks failed)`,
      filePath,
      allValidationErrors
    );
  }
}
