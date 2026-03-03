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

export type WrongSectionResult =
  | { found: true; actualSection: "product" | "content"; attribute: CachedAttribute }
  | { found: false };

export interface CacheStats {
  productAttributeCount: number;
  contentAttributeCount: number;
  totalCount: number;
}

export interface IAttributeCache {
  populateProductAttributes(attrs: readonly CachedAttribute[]): void;
  populateContentAttributes(attrs: readonly CachedAttribute[]): void;
  getProductAttribute(name: string): CachedAttribute | undefined;
  getContentAttribute(name: string): CachedAttribute | undefined;
  hasProductAttribute(name: string): boolean;
  hasContentAttribute(name: string): boolean;
  findAttributeInWrongSection(
    name: string,
    expectedSection: "product" | "content"
  ): WrongSectionResult;
  getStats(): CacheStats;
  clear(): void;
  getAllProductAttributeNames(): string[];
  getAllContentAttributeNames(): string[];
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
  private readonly productAttributes = new Map<string, CachedAttribute>();
  private readonly contentAttributes = new Map<string, CachedAttribute>();

  populateProductAttributes(attrs: readonly CachedAttribute[]): void {
    for (const attr of attrs) {
      this.productAttributes.set(attr.name, attr);
    }
  }

  populateContentAttributes(attrs: readonly CachedAttribute[]): void {
    for (const attr of attrs) {
      this.contentAttributes.set(attr.name, attr);
    }
  }

  getProductAttribute(name: string): CachedAttribute | undefined {
    return this.productAttributes.get(name);
  }

  getContentAttribute(name: string): CachedAttribute | undefined {
    return this.contentAttributes.get(name);
  }

  hasProductAttribute(name: string): boolean {
    return this.productAttributes.has(name);
  }

  hasContentAttribute(name: string): boolean {
    return this.contentAttributes.has(name);
  }

  findAttributeInWrongSection(
    name: string,
    expectedSection: "product" | "content"
  ): WrongSectionResult {
    if (expectedSection === "product") {
      const attr = this.contentAttributes.get(name);
      return attr ? { found: true, actualSection: "content", attribute: attr } : { found: false };
    }

    const attr = this.productAttributes.get(name);
    return attr ? { found: true, actualSection: "product", attribute: attr } : { found: false };
  }

  getStats(): CacheStats {
    return {
      productAttributeCount: this.productAttributes.size,
      contentAttributeCount: this.contentAttributes.size,
      totalCount: this.productAttributes.size + this.contentAttributes.size,
    };
  }

  clear(): void {
    this.productAttributes.clear();
    this.contentAttributes.clear();
  }

  getAllProductAttributeNames(): string[] {
    return Array.from(this.productAttributes.keys());
  }

  getAllContentAttributeNames(): string[] {
    return Array.from(this.contentAttributes.keys());
  }
}
