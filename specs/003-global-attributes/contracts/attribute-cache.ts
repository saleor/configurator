/**
 * Contract: AttributeCache Interface
 *
 * This file defines the contract for the in-memory attribute cache
 * used during deployment to enable fast reference resolution.
 */

// ============================================================================
// CACHED ATTRIBUTE TYPE
// ============================================================================

/**
 * Minimal attribute metadata needed for reference resolution
 */
export interface CachedAttribute {
  /** Saleor attribute ID (e.g., "QXR0cmlidXRlOjgz") */
  readonly id: string;

  /** Attribute name (e.g., "Publisher") */
  readonly name: string;

  /** Attribute slug (e.g., "publisher") */
  readonly slug: string;

  /** Input type (e.g., "DROPDOWN", "PLAIN_TEXT") */
  readonly inputType: string;
}

// ============================================================================
// ATTRIBUTE CACHE INTERFACE
// ============================================================================

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
export interface IAttributeCache {
  // =========================================================================
  // POPULATION METHODS (called by attributesStage)
  // =========================================================================

  /**
   * Add product attributes to cache after creation/update.
   * Called by attributesStage after processing productAttributes section.
   */
  populateProductAttributes(attrs: readonly CachedAttribute[]): void;

  /**
   * Add content attributes to cache after creation/update.
   * Called by attributesStage after processing contentAttributes section.
   */
  populateContentAttributes(attrs: readonly CachedAttribute[]): void;

  // =========================================================================
  // LOOKUP METHODS (called by productTypesStage, modelTypesStage)
  // =========================================================================

  /**
   * Get a product attribute by name.
   * Returns undefined if not found (caller should handle error).
   */
  getProductAttribute(name: string): CachedAttribute | undefined;

  /**
   * Get a content attribute by name.
   * Returns undefined if not found (caller should handle error).
   */
  getContentAttribute(name: string): CachedAttribute | undefined;

  /**
   * Check if a product attribute exists by name.
   */
  hasProductAttribute(name: string): boolean;

  /**
   * Check if a content attribute exists by name.
   */
  hasContentAttribute(name: string): boolean;

  // =========================================================================
  // VALIDATION HELPERS
  // =========================================================================

  /**
   * Check if an attribute exists in the wrong section.
   * Used to provide better error messages when users reference
   * an attribute from the wrong section.
   *
   * @param name - Attribute name to search for
   * @param expectedSection - The section where the attribute should be
   * @returns Object indicating if found and in which section
   *
   * @example
   * // User has { attribute: "Author" } in productTypes
   * // But "Author" is in contentAttributes
   * const result = cache.findAttributeInWrongSection("Author", "product");
   * // result = { found: true, actualSection: "content" }
   */
  findAttributeInWrongSection(
    name: string,
    expectedSection: "product" | "content"
  ): WrongSectionResult;

  // =========================================================================
  // DEBUG / STATS
  // =========================================================================

  /**
   * Get count of cached attributes by section.
   * Useful for logging and debugging.
   */
  getStats(): CacheStats;

  /**
   * Clear all cached data.
   * Called at start of new deployment (if reusing context).
   */
  clear(): void;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export interface WrongSectionResult {
  /** Whether the attribute was found in any section */
  found: boolean;

  /** The section where the attribute was actually found (if found) */
  actualSection?: "product" | "content";

  /** The attribute metadata (if found) */
  attribute?: CachedAttribute;
}

export interface CacheStats {
  /** Number of product attributes cached */
  productAttributeCount: number;

  /** Number of content attributes cached */
  contentAttributeCount: number;

  /** Total attributes cached */
  totalCount: number;
}

// ============================================================================
// IMPLEMENTATION EXAMPLE
// ============================================================================

/**
 * Reference implementation of AttributeCache.
 * Actual implementation will be in src/modules/attribute/attribute-cache.ts
 */
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
}
