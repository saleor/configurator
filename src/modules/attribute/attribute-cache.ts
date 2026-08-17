/**
 * In-memory cache for attribute metadata during deployment.
 *
 * Lifecycle:
 * 1. attributesStage creates/updates attributes via API
 * 2. attributesStage populates cache with results
 * 3. productTypesStage and modelTypesStage use cache for reference resolution
 *
 * Benefits:
 * - Eliminates redundant API queries during deployment
 * - Enables fast O(1) lookups by name
 * - Provides clear error messages for wrong-type references
 */

/** Known Saleor attribute input types — single source of truth */
export const ATTRIBUTE_INPUT_TYPES = [
  "DROPDOWN",
  "MULTISELECT",
  "SWATCH",
  "REFERENCE",
  "SINGLE_REFERENCE",
  "PLAIN_TEXT",
  "NUMERIC",
  "DATE",
  "BOOLEAN",
  "RICH_TEXT",
  "DATE_TIME",
  "FILE",
] as const;

export type AttributeInputType = (typeof ATTRIBUTE_INPUT_TYPES)[number];

export interface CachedAttributeChoice {
  readonly id: string;
  readonly name: string;
  readonly value: string;
}

export interface CachedAttribute {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly inputType: AttributeInputType;
  readonly entityType: string | null;
  readonly choices: readonly CachedAttributeChoice[];
}

/** Config section an attribute is declared in — determines its Saleor attribute type. */
export const ATTRIBUTE_SECTIONS = ["product", "content", "customer"] as const;

export type AttributeSection = (typeof ATTRIBUTE_SECTIONS)[number];

export type WrongSectionResult =
  | { found: true; actualSection: AttributeSection; attribute: CachedAttribute }
  | { found: false };

export interface CacheStats {
  productAttributeCount: number;
  contentAttributeCount: number;
  customerAttributeCount: number;
  totalCount: number;
}

export interface IAttributeCache {
  populate(section: AttributeSection, attrs: readonly CachedAttribute[]): void;
  get(section: AttributeSection, name: string): CachedAttribute | undefined;
  has(section: AttributeSection, name: string): boolean;
  findAttributeInWrongSection(name: string, expectedSection: AttributeSection): WrongSectionResult;
  getStats(): CacheStats;
  clear(): void;
  getAllNames(section: AttributeSection): string[];
}

/**
 * Shape that attribute resolvers expect — mirrors the GraphQL edge/node structure.
 * Decoupled from the full GraphQL Attribute type to keep the cache independent.
 */
export interface ResolverAttribute {
  readonly id: string;
  readonly name: string;
  readonly entityType: string | null;
  readonly inputType: string;
  readonly choices: {
    readonly edges: ReadonlyArray<{
      readonly node: {
        readonly id: string;
        readonly name: string;
        readonly value: string;
      };
    }>;
  } | null;
}

/** Convert flat cache entry to the edge/node shape resolvers expect. */
export function cachedToResolverAttribute(cached: CachedAttribute): ResolverAttribute {
  return {
    id: cached.id,
    name: cached.name,
    entityType: cached.entityType,
    inputType: cached.inputType,
    choices: {
      edges: cached.choices.map((c) => ({
        node: { id: c.id, name: c.name, value: c.value },
      })),
    },
  };
}

export class AttributeCache implements IAttributeCache {
  private readonly sections: Record<AttributeSection, Map<string, CachedAttribute>> = {
    product: new Map(),
    content: new Map(),
    customer: new Map(),
  };

  populate(section: AttributeSection, attrs: readonly CachedAttribute[]): void {
    const target = this.sections[section];
    for (const attr of attrs) {
      target.set(attr.name, attr);
    }
  }

  get(section: AttributeSection, name: string): CachedAttribute | undefined {
    return this.sections[section].get(name);
  }

  has(section: AttributeSection, name: string): boolean {
    return this.sections[section].has(name);
  }

  findAttributeInWrongSection(name: string, expectedSection: AttributeSection): WrongSectionResult {
    for (const section of ATTRIBUTE_SECTIONS) {
      if (section === expectedSection) continue;
      const attr = this.sections[section].get(name);
      if (attr) {
        return { found: true, actualSection: section, attribute: attr };
      }
    }
    return { found: false };
  }

  getStats(): CacheStats {
    const { product, content, customer } = this.sections;
    return {
      productAttributeCount: product.size,
      contentAttributeCount: content.size,
      customerAttributeCount: customer.size,
      totalCount: product.size + content.size + customer.size,
    };
  }

  clear(): void {
    for (const section of ATTRIBUTE_SECTIONS) {
      this.sections[section].clear();
    }
  }

  getAllNames(section: AttributeSection): string[] {
    return Array.from(this.sections[section].keys());
  }
}
