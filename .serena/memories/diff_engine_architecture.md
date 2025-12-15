# Diff Engine Architecture

**Deep dive into the Comparator pattern and change detection system**

## Table of Contents

1. [Overview](#overview)
2. [Architecture Patterns](#architecture-patterns)
3. [Core Components](#core-components)
4. [BaseEntityComparator](#baseentitycomparator)
5. [Comparator Implementations](#comparator-implementations)
6. [DiffService Integration](#diffservice-integration)
7. [Change Detection Algorithms](#change-detection-algorithms)
8. [Deduplication Logic](#deduplication-logic)
9. [Normalization Strategies](#normalization-strategies)
10. [Field Comparison Patterns](#field-comparison-patterns)
11. [Complex Entity Handling](#complex-entity-handling)
12. [Diff Results and Types](#diff-results-and-types)
13. [Testing Patterns](#testing-patterns)
14. [Serena Navigation](#serena-navigation)
15. [Best Practices](#best-practices)

---

## Overview

The **Diff Engine** is the core comparison system that detects differences between local configuration (YAML) and remote Saleor state (GraphQL). It uses the **Strategy Pattern** with entity-specific comparators to perform intelligent change detection.

### Purpose

- **Compare** local YAML configuration with remote Saleor entities
- **Detect** changes (CREATE, UPDATE, DELETE operations)
- **Normalize** entities for accurate comparison
- **Deduplicate** corrupted remote state
- **Provide** detailed field-level change information

### Key Design Goals

1. **Accuracy**: No false positives or false negatives
2. **Performance**: Concurrent comparison execution
3. **Extensibility**: Easy to add new entity comparators
4. **Resilience**: Handle corrupted remote state gracefully
5. **Transparency**: Clear change descriptions for users

### File Structure

```
src/core/diff/
├── comparators/
│   ├── base-comparator.ts          # Abstract base class
│   ├── product-comparator.ts       # Product comparison logic
│   ├── category-comparator.ts      # Category + subcategories
│   ├── channel-comparator.ts       # Channel settings
│   ├── attributes-comparator.ts    # Product attributes
│   ├── collection-comparator.ts    # Collections
│   ├── menu-comparator.ts          # Navigation menus
│   ├── warehouse-comparator.ts     # Warehouses
│   ├── shipping-zone-comparator.ts # Shipping zones
│   ├── tax-class-comparator.ts     # Tax classes
│   ├── product-type-comparator.ts  # Product types
│   ├── page-type-comparator.ts     # Page types
│   ├── model-comparator.ts         # Content models
│   ├── shop-comparator.ts          # Shop settings
│   └── index.ts                    # Exports
├── service.ts                       # DiffService orchestrator
├── types.ts                         # Type definitions
├── diff-operations.ts               # Helper utilities
├── constants.ts                     # Icons and messages
├── formatter.ts                     # Output formatting
└── errors.ts                        # Diff-specific errors
```

---

## Architecture Patterns

### 1. Strategy Pattern

Each entity type has its own comparator strategy:

```typescript
interface EntityComparator<TLocal = unknown, TRemote = unknown> {
  compare(local: TLocal, remote: TRemote): Promise<readonly DiffResult[]> | readonly DiffResult[];
}
```

**Benefits:**
- Entity-specific comparison logic is encapsulated
- Easy to add new entity types
- Each comparator can have custom normalization
- Independent testing of each comparator

### 2. Template Method Pattern

`BaseEntityComparator` provides template methods for common operations:

```typescript
abstract class BaseEntityComparator<TLocal, TRemote, TEntity> {
  // Template method - defines the algorithm structure
  abstract compare(local: TLocal, remote: TRemote): readonly DiffResult[];
  
  // Hook methods - implemented by subclasses
  protected abstract getEntityName(entity: TEntity): string;
  protected abstract compareEntityFields(local: TEntity, remote: TEntity): DiffChange[];
  
  // Shared utility methods
  protected createEntityMap(entities: readonly TEntity[]): Map<string, TEntity>;
  protected deduplicateEntities(entities: readonly TEntity[]): readonly TEntity[];
  protected validateUniqueIdentifiers(entities: readonly TEntity[]): void;
}
```

**Benefits:**
- Common logic is reused (deduplication, validation, map creation)
- Subclasses only implement entity-specific logic
- Consistent behavior across all comparators

### 3. Registry Pattern

`DiffService` maintains a registry of comparators:

```typescript
class DiffService {
  private comparators: ReadonlyMap<string, EntityComparator>;
  
  private createComparators(): ReadonlyMap<string, EntityComparator> {
    return new Map([
      ["shop", new ShopComparator()],
      ["channels", new ChannelComparator()],
      ["products", new ProductComparator()],
      // ... more comparators
    ]);
  }
}
```

**Benefits:**
- Centralized comparator management
- Easy to enable/disable comparators
- Supports selective comparison

---

## Core Components

### 1. EntityComparator Interface

**Location:** `src/core/diff/comparators/base-comparator.ts:10-18`

```typescript
export interface EntityComparator<TLocal = unknown, TRemote = unknown> {
  /**
   * Compares local and remote entities and returns diff results
   * @param local Local entities from configuration
   * @param remote Remote entities from Saleor
   * @returns Array of diff results
   */
  compare(local: TLocal, remote: TRemote): Promise<readonly DiffResult[]> | readonly DiffResult[];
}
```

**Purpose:** Defines the contract for all comparators.

### 2. BaseEntityComparator Abstract Class

**Location:** `src/core/diff/comparators/base-comparator.ts:26-200`

**Abstract Members:**
```typescript
protected abstract readonly entityType: EntityType;
abstract compare(local: TLocal, remote: TRemote): readonly DiffResult[];
protected abstract getEntityName(entity: TEntity): string;
protected abstract compareEntityFields(local: TEntity, remote: TEntity): DiffChange[];
```

**Provided Methods:**
- `createEntityMap()` - Creates name-to-entity map
- `deduplicateEntities()` - Removes duplicates with warning
- `validateUniqueIdentifiers()` - Throws on duplicates
- `createCreateResult()` - Builds CREATE diff result
- `createUpdateResult()` - Builds UPDATE diff result
- `createDeleteResult()` - Builds DELETE diff result
- `createFieldChange()` - Creates DiffChange object
- `serializeValue()` - Serializes values for display

### 3. DiffService

**Location:** `src/core/diff/service.ts:59-553`

**Responsibilities:**
- Load local and remote configurations
- Execute comparators concurrently
- Aggregate results
- Calculate summary statistics
- Support selective comparison

**Key Methods:**
- `compare()` - Full comparison
- `compareForIntrospect()` - Comparison for introspect command
- `performComparisons()` - Execute all comparators
- `performSelectiveComparisons()` - Execute subset of comparators
- `executeConcurrently()` - Concurrent execution with limit

---

## BaseEntityComparator

### Class Structure

```typescript
export abstract class BaseEntityComparator<TLocal, TRemote, TEntity extends Record<string, unknown>>
  implements EntityComparator<TLocal, TRemote>
{
  protected abstract readonly entityType: EntityType;
  
  // Must be implemented by subclasses
  abstract compare(local: TLocal, remote: TRemote): readonly DiffResult[];
  protected abstract getEntityName(entity: TEntity): string;
  protected abstract compareEntityFields(local: TEntity, remote: TEntity): DiffChange[];
  
  // Provided utility methods
  protected createEntityMap(entities: readonly TEntity[]): Map<string, TEntity>;
  protected deduplicateEntities(entities: readonly TEntity[]): readonly TEntity[];
  protected validateUniqueIdentifiers(entities: readonly TEntity[]): void;
  protected createCreateResult(local: TEntity): DiffResult;
  protected createUpdateResult(local: TEntity, remote: TEntity, changes: DiffChange[]): DiffResult;
  protected createDeleteResult(remote: TEntity): DiffResult;
  protected createFieldChange(field: string, current: unknown, desired: unknown, description?: string): DiffChange;
  private serializeValue(value: unknown): string;
}
```

### Method Details

#### createEntityMap()

**Location:** `src/core/diff/comparators/base-comparator.ts:60-62`

```typescript
protected createEntityMap(entities: readonly TEntity[]): Map<string, TEntity> {
  return new Map(entities.map((entity) => [this.getEntityName(entity), entity]));
}
```

**Purpose:** Creates a Map for O(1) entity lookup by name/slug.

**Usage:** Called at the start of `compare()` to build lookup maps.

#### deduplicateEntities()

**Location:** `src/core/diff/comparators/base-comparator.ts:93-115`

```typescript
protected deduplicateEntities(entities: readonly TEntity[]): readonly TEntity[] {
  const seen = new Set<string>();
  const duplicateNames = new Set<string>();
  const deduplicatedEntities: TEntity[] = [];

  for (const entity of entities) {
    const name = this.getEntityName(entity);
    if (seen.has(name)) {
      duplicateNames.add(name);
    } else {
      seen.add(name);
      deduplicatedEntities.push(entity);
    }
  }

  if (duplicateNames.size > 0) {
    logger.warn(
      `Duplicate ${this.entityType} detected: ${Array.from(duplicateNames).join(", ")}. Using first occurrence only.`
    );
  }

  return deduplicatedEntities;
}
```

**Purpose:** Handles corrupted remote state with duplicate entities.

**Strategy:**
- Keep **first occurrence** of each entity
- Log warning with duplicate names
- Continue processing (graceful degradation)

**Why This Matters:**
- Saleor can sometimes have duplicate slugs/names due to bugs
- Without deduplication, comparison would fail
- Users are alerted but deployment continues

#### validateUniqueIdentifiers()

**Location:** `src/core/diff/comparators/base-comparator.ts:70-87`

```typescript
protected validateUniqueIdentifiers(entities: readonly TEntity[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const entity of entities) {
    const name = this.getEntityName(entity);
    if (seen.has(name)) {
      duplicates.push(name);
    }
    seen.add(name);
  }

  if (duplicates.length > 0) {
    throw new EntityValidationError(
      `Duplicate ${this.entityType} identifiers found: ${duplicates.join(", ")}`
    );
  }
}
```

**Purpose:** Validates that entities have unique identifiers.

**Usage:** Called at the start of `compare()` to fail fast on invalid data.

**Difference from deduplicateEntities():**
- `validateUniqueIdentifiers()` - **Throws error** (strict validation)
- `deduplicateEntities()` - **Warns and continues** (graceful recovery)

#### createCreateResult()

**Location:** `src/core/diff/comparators/base-comparator.ts:122-129`

```typescript
protected createCreateResult(local: TEntity): DiffResult {
  return {
    operation: "CREATE",
    entityType: this.entityType,
    entityName: this.getEntityName(local),
    desired: local,
  };
}
```

**Purpose:** Creates a DiffResult for entities that exist locally but not remotely.

#### createUpdateResult()

**Location:** `src/core/diff/comparators/base-comparator.ts:138-151`

```typescript
protected createUpdateResult(local: TEntity, remote: TEntity, changes: DiffChange[]): DiffResult {
  return {
    operation: "UPDATE",
    entityType: this.entityType,
    entityName: this.getEntityName(local),
    current: remote,
    desired: local,
    changes,
  };
}
```

**Purpose:** Creates a DiffResult for entities that differ between local and remote.

#### createDeleteResult()

**Location:** `src/core/diff/comparators/base-comparator.ts:158-165`

```typescript
protected createDeleteResult(remote: TEntity): DiffResult {
  return {
    operation: "DELETE",
    entityType: this.entityType,
    entityName: this.getEntityName(remote),
    current: remote,
  };
}
```

**Purpose:** Creates a DiffResult for entities that exist remotely but not locally.

**Note:** DELETE operations are detected but not executed by the configurator.

#### createFieldChange()

**Location:** `src/core/diff/comparators/base-comparator.ts:175-189`

```typescript
protected createFieldChange(
  field: string,
  currentValue: unknown,
  desiredValue: unknown,
  description?: string
): DiffChange {
  return {
    field,
    currentValue: this.serializeValue(currentValue),
    desiredValue: this.serializeValue(desiredValue),
    description,
  };
}
```

**Purpose:** Creates a DiffChange object for a single field.

**Parameters:**
- `field` - Field name (e.g., "name", "attributes.color")
- `currentValue` - Current value in remote Saleor
- `desiredValue` - Desired value from local config
- `description` - Optional human-readable description

---

## Comparator Implementations

### Common Implementation Pattern

All comparators follow this pattern:

```typescript
export class EntityComparator extends BaseEntityComparator<
  readonly EntityType[],  // TLocal
  readonly EntityType[],  // TRemote
  EntityType              // TEntity
> {
  protected readonly entityType: EntityType = "Entity Name";

  compare(local: readonly EntityType[], remote: readonly EntityType[]): readonly DiffResult[] {
    // 1. Validate unique identifiers
    this.validateUniqueIdentifiers(local);
    this.validateUniqueIdentifiers(remote);

    const results: DiffResult[] = [];
    
    // 2. Create lookup maps
    const remoteByName = this.createEntityMap(remote);
    const localByName = this.createEntityMap(local);

    // 3. Check for creates and updates
    for (const localEntity of local) {
      const remoteEntity = remoteByName.get(this.getEntityName(localEntity));

      if (!remoteEntity) {
        results.push(this.createCreateResult(localEntity));
      } else {
        const changes = this.compareEntityFields(localEntity, remoteEntity);
        if (changes.length > 0) {
          results.push(this.createUpdateResult(localEntity, remoteEntity, changes));
        }
      }
    }

    // 4. Check for deletes
    for (const remoteEntity of remote) {
      if (!localByName.has(this.getEntityName(remoteEntity))) {
        results.push(this.createDeleteResult(remoteEntity));
      }
    }

    return results;
  }

  protected getEntityName(entity: EntityType): string {
    return entity.slug ?? entity.name;
  }

  protected compareEntityFields(local: EntityType, remote: EntityType): DiffChange[] {
    const changes: DiffChange[] = [];
    // Entity-specific field comparison logic
    return changes;
  }
}
```

### ProductComparator

**Location:** `src/core/diff/comparators/product-comparator.ts:12-444`

**Entity Type:** `"Products"`

**Complexity:** HIGH - Most complex comparator

**Special Features:**
- Variant comparison (nested entities with SKUs)
- Media comparison (order-sensitive arrays)
- Channel listings (per-channel pricing)
- Attributes (order-insensitive comparison)
- Description normalization (EditorJS JSON → plain text)

**Key Methods:**

#### compareEntityFields()

**Location:** `src/core/diff/comparators/product-comparator.ts:72-281`

Compares:
- Basic fields: `name`, `productType`, `category`, `taxClass`
- Description: EditorJS JSON → plain text extraction
- Attributes: Order-insensitive comparison
- Channel listings: Per-channel settings
- Variants: Deep comparison by SKU
- Media: Order-sensitive comparison

**Description Normalization:**
```typescript
const extractText = (value: unknown): string | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const raw = value.trim();
  try {
    const json = JSON.parse(raw);
    if (json && Array.isArray(json.blocks)) {
      const parts = json.blocks
        .map((b) => b?.data?.text)
        .filter((t) => t && t.length > 0);
      return stripTags(decodeEntities(parts.join(" "))).trim();
    }
    return stripTags(decodeEntities(raw)).trim();
  } catch {
    return stripTags(decodeEntities(raw)).trim();
  }
};
```

**Purpose:** Compare text content, not JSON structure.

#### compareVariants()

**Location:** `src/core/diff/comparators/product-comparator.ts:312-384`

Compares product variants by SKU:
- Variant name
- Attributes
- Channel listings (pricing per channel)
- Stock tracking

**Deduplication Strategy:**
```typescript
const pickRicher = (a: ProductVariantInput, b: ProductVariantInput) => {
  const aLen = Array.isArray(a.channelListings) ? a.channelListings.length : 0;
  const bLen = Array.isArray(b.channelListings) ? b.channelListings.length : 0;
  return bLen > aLen ? b : a;
};
```

**Purpose:** If duplicate SKUs exist, keep the variant with more channel listings.

#### normalizeChannelListing()

**Location:** `src/core/diff/comparators/product-comparator.ts:386-415`

Normalizes channel listing for comparison:
- Sorts arrays by channel name
- Removes `undefined` values
- Ensures consistent structure

### CategoryComparator

**Location:** `src/core/diff/comparators/category-comparator.ts:21-197`

**Entity Type:** `"Categories"`

**Complexity:** MEDIUM - Hierarchical structure

**Special Features:**
- Recursive subcategory comparison
- Slug-based identification
- Nested structure support

**Key Methods:**

#### compareSubcategories()

**Location:** `src/core/diff/comparators/category-comparator.ts:121-166`

Recursively compares subcategories:

```typescript
private compareSubcategories(
  local: readonly Subcategory[],
  remote: readonly Subcategory[]
): DiffChange[] {
  const changes: DiffChange[] = [];

  const localSubcatMap = new Map(local.map((subcat) => [subcat.slug, subcat]));
  const remoteSubcatMap = new Map(remote.map((subcat) => [subcat.slug, subcat]));

  // Find added subcategories
  for (const localSubcat of local) {
    if (!remoteSubcatMap.has(localSubcat.slug)) {
      changes.push(
        this.createFieldChange(
          "subcategories",
          null,
          localSubcat.name,
          `Subcategory "${localSubcat.name}" added`
        )
      );
    } else {
      // Compare existing recursively
      const remoteSubcat = remoteSubcatMap.get(localSubcat.slug);
      if (remoteSubcat) {
        const nestedChanges = this.compareSubcategoryStructure(localSubcat, remoteSubcat);
        changes.push(...nestedChanges);
      }
    }
  }

  // Find removed subcategories
  for (const remoteSubcat of remote) {
    if (!localSubcatMap.has(remoteSubcat.slug)) {
      changes.push(
        this.createFieldChange(
          "subcategories",
          remoteSubcat.name,
          null,
          `Subcategory "${remoteSubcat.name}" removed`
        )
      );
    }
  }

  return changes;
}
```

**Purpose:** Detect added, removed, and modified subcategories.

### ChannelComparator

**Location:** `src/core/diff/comparators/channel-comparator.ts`

**Entity Type:** `"Channels"`

**Complexity:** MEDIUM - Settings and tax configuration

**Special Features:**
- Channel settings comparison (currencies, countries)
- Tax configuration comparison
- Field-by-field comparison with defined field lists

**Field Constants:**

```typescript
const CHANNEL_FIELDS = [
  "name",
  "slug",
  "currencyCode",
  "defaultCountry",
  "isActive",
] as const;

const CHANNEL_SETTINGS_FIELDS = [
  "allowUnpaidOrders",
  "automaticFulfillmentDigitalProducts",
  "defaultTransactionFlowStrategy",
  "deleteExpiredOrdersAfter",
  "markAsPaidStrategy",
] as const;

const TAX_CONFIGURATION_FIELDS = [
  "chargeTaxes",
  "displayGrossPrices",
  "pricesEnteredWithTax",
  "taxCalculationStrategy",
] as const;
```

**Purpose:** Ensures all important channel settings are compared.

### ShopComparator

**Location:** `src/core/diff/comparators/shop-comparator.ts`

**Entity Type:** `"Shop Settings"`

**Complexity:** LOW - Single entity comparison

**Special Features:**
- Compares single shop settings object (not arrays)
- No CREATE/DELETE operations (shop always exists)
- Only UPDATE operations

### Other Comparators

All follow similar patterns with entity-specific logic:

- **AttributesComparator** - Product/page attributes
- **CollectionComparator** - Product collections
- **MenuComparator** - Navigation menus
- **ModelComparator** - Content models (pages)
- **WarehouseComparator** - Warehouse locations
- **ShippingZoneComparator** - Shipping zones and rates
- **TaxClassComparator** - Tax classes and rates
- **ProductTypeComparator** - Product type definitions
- **PageTypeComparator** - Page type definitions (also used for models)

---

## DiffService Integration

### Comparator Registry

**Location:** `src/core/diff/service.ts:294-311`

```typescript
private createComparators(): ReadonlyMap<string, EntityComparator> {
  return new Map([
    ["shop", new ShopComparator() as EntityComparator],
    ["channels", new ChannelComparator() as EntityComparator],
    ["attributes", new AttributesComparator() as EntityComparator],
    ["productTypes", new ProductTypeComparator() as EntityComparator],
    ["pageTypes", new PageTypeComparator() as EntityComparator],
    ["modelTypes", new PageTypeComparator() as EntityComparator], // Reuses PageType comparator
    ["categories", new CategoryComparator() as EntityComparator],
    ["products", new ProductComparator() as EntityComparator],
    ["collections", new CollectionComparator() as EntityComparator],
    ["menus", new MenuComparator() as EntityComparator],
    ["models", new ModelComparator() as EntityComparator],
    ["warehouses", new WarehouseComparator() as EntityComparator],
    ["shippingZones", new ShippingZoneComparator() as EntityComparator],
    ["taxClasses", new TaxClassComparator() as EntityComparator],
  ]);
}
```

**Note:** `modelTypes` reuses `PageTypeComparator` because they share the same structure.

### Comparison Execution

**Location:** `src/core/diff/service.ts:362-405`

```typescript
private async performComparisons(
  localConfig: SaleorConfig,
  remoteConfig: SaleorConfig
): Promise<readonly DiffResult[]> {
  const comparisons: Promise<readonly DiffResult[]>[] = [];

  // Shop settings comparison
  if (this.comparators.has("shop")) {
    comparisons.push(this.performComparison("shop", localConfig.shop, remoteConfig.shop));
  }

  // Entity array comparisons
  const entityTypes = [
    "channels",
    "attributes",
    "productTypes",
    "pageTypes",
    "modelTypes",
    "categories",
    "products",
    "collections",
    "menus",
    "models",
    "warehouses",
    "shippingZones",
    "taxClasses",
  ] as const;

  for (const entityType of entityTypes) {
    if (this.comparators.has(entityType)) {
      comparisons.push(
        this.performComparison(
          entityType,
          localConfig[entityType] || [],
          remoteConfig[entityType] || []
        )
      );
    }
  }

  // Execute comparisons with concurrency limit
  const results = await this.executeConcurrently(comparisons);
  return results.flat();
}
```

**Features:**
- All comparisons run concurrently (performance)
- Missing config sections default to empty arrays
- Results are flattened into single array

### Concurrent Execution

**Location:** `src/core/diff/service.ts:500-519`

```typescript
private async executeConcurrently<T>(
  promises: readonly Promise<T>[]
): Promise<readonly T[]> {
  const concurrencyLimit = this.config.concurrency || 5;
  const results: T[] = [];

  for (let i = 0; i < promises.length; i += concurrencyLimit) {
    const batch = promises.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }

  return results;
}
```

**Purpose:** Limit concurrent comparisons to avoid overwhelming the system.

**Default:** 5 concurrent comparisons at a time.

---

## Change Detection Algorithms

### Algorithm Overview

Each comparator implements a **3-phase algorithm**:

1. **CREATE Detection** - In local, not in remote
2. **UPDATE Detection** - In both, but different
3. **DELETE Detection** - In remote, not in local

### Phase 1: CREATE Detection

```typescript
for (const localEntity of local) {
  const remoteEntity = remoteByName.get(this.getEntityName(localEntity));

  if (!remoteEntity) {
    // Entity exists locally but not remotely → CREATE
    results.push(this.createCreateResult(localEntity));
  }
}
```

**Logic:** If local entity is not found in remote map, it needs to be created.

**Result:**
```typescript
{
  operation: "CREATE",
  entityType: "Products",
  entityName: "new-product",
  desired: { /* local entity */ }
}
```

### Phase 2: UPDATE Detection

```typescript
for (const localEntity of local) {
  const remoteEntity = remoteByName.get(this.getEntityName(localEntity));

  if (remoteEntity) {
    // Entity exists in both → compare fields
    const changes = this.compareEntityFields(localEntity, remoteEntity);
    
    if (changes.length > 0) {
      // Differences found → UPDATE
      results.push(this.createUpdateResult(localEntity, remoteEntity, changes));
    }
  }
}
```

**Logic:** If local entity is found in remote map, compare their fields.

**Result:**
```typescript
{
  operation: "UPDATE",
  entityType: "Products",
  entityName: "existing-product",
  current: { /* remote entity */ },
  desired: { /* local entity */ },
  changes: [
    { field: "name", currentValue: "Old Name", desiredValue: "New Name" },
    { field: "price", currentValue: "10.00", desiredValue: "15.00" }
  ]
}
```

### Phase 3: DELETE Detection

```typescript
for (const remoteEntity of remote) {
  if (!localByName.has(this.getEntityName(remoteEntity))) {
    // Entity exists remotely but not locally → DELETE
    results.push(this.createDeleteResult(remoteEntity));
  }
}
```

**Logic:** If remote entity is not found in local map, it should be deleted.

**Result:**
```typescript
{
  operation: "DELETE",
  entityType: "Products",
  entityName: "removed-product",
  current: { /* remote entity */ }
}
```

**Note:** DELETE operations are detected but **not executed** by the configurator.

---

## Deduplication Logic

### Why Deduplication?

**Problem:** Saleor can have duplicate entities due to:
- Bugs in Saleor API
- Race conditions during parallel updates
- Corrupted remote state

**Impact Without Deduplication:**
- Comparison fails with errors
- User cannot deploy configuration
- Manual cleanup required in Saleor admin

**Solution:** Graceful deduplication with warnings.

### Deduplication Strategy

**Location:** `src/core/diff/comparators/base-comparator.ts:93-115`

```typescript
protected deduplicateEntities(entities: readonly TEntity[]): readonly TEntity[] {
  const seen = new Set<string>();
  const duplicateNames = new Set<string>();
  const deduplicatedEntities: TEntity[] = [];

  for (const entity of entities) {
    const name = this.getEntityName(entity);
    if (seen.has(name)) {
      duplicateNames.add(name);  // Track duplicates
    } else {
      seen.add(name);
      deduplicatedEntities.push(entity);  // Keep first occurrence
    }
  }

  if (duplicateNames.size > 0) {
    logger.warn(
      `Duplicate ${this.entityType} detected: ${Array.from(duplicateNames).join(", ")}. Using first occurrence only.`
    );
  }

  return deduplicatedEntities;
}
```

**Strategy:**
1. **Keep first occurrence** of each entity
2. **Track duplicate names** for warning
3. **Log warning** to alert user
4. **Continue processing** (graceful degradation)

### When to Use

**Remote State:** Always deduplicate remote entities (from Saleor).

```typescript
const deduplicatedRemote = this.deduplicateEntities(remote);
const remoteByName = this.createEntityMap(deduplicatedRemote);
```

**Local State:** Validate strictly (throw on duplicates).

```typescript
this.validateUniqueIdentifiers(local);  // Throws if duplicates found
```

**Rationale:**
- Local config is under user control → strict validation
- Remote state is from Saleor → graceful recovery

---

## Normalization Strategies

### Why Normalization?

**Problem:** Entities from different sources may have:
- Different field ordering
- Undefined vs. null vs. missing fields
- Array ordering differences
- Inconsistent serialization

**Solution:** Normalize entities before comparison.

### Common Normalization Patterns

#### 1. Sort Arrays (Order-Insensitive)

```typescript
private normalizeArray<T>(arr: readonly T[] | undefined, keyFn: (item: T) => string): T[] {
  if (!arr || arr.length === 0) return [];
  return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}
```

**Example:** Channel listings

```typescript
const localChannels = this.normalizeArray(local.channelListings, (c) => c.channel);
const remoteChannels = this.normalizeArray(remote.channelListings, (c) => c.channel);
```

#### 2. Remove Undefined Values

```typescript
private removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  return result;
}
```

**Purpose:** Ensure `{ field: undefined }` equals `{ }` in comparison.

#### 3. Deep Comparison with Normalization

```typescript
private equalsChannelListing(local: ChannelListing, remote: ChannelListing): boolean {
  const normalizedLocal = this.normalizeChannelListing(local);
  const normalizedRemote = this.normalizeChannelListing(remote);
  return JSON.stringify(normalizedLocal) === JSON.stringify(normalizedRemote);
}
```

**Steps:**
1. Normalize both entities
2. Serialize to JSON
3. Compare strings

**Caution:** Only works if normalization ensures consistent ordering.

#### 4. Text Extraction (EditorJS)

**Location:** `src/core/diff/comparators/product-comparator.ts:81-118`

```typescript
const extractText = (value: unknown): string | undefined => {
  if (!value || typeof value !== "string") return undefined;
  const raw = value.trim();
  
  const decodeEntities = (s: string) =>
    s
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
      
  const stripTags = (s: string) => s.replace(/<[^>]*>/g, "");
  
  try {
    const json = JSON.parse(raw);
    if (json && Array.isArray(json.blocks)) {
      const parts = json.blocks
        .map((b) => b?.data?.text)
        .filter((t) => t && t.length > 0);
      return stripTags(decodeEntities(parts.join(" "))).trim();
    }
    return stripTags(decodeEntities(raw)).trim();
  } catch {
    return stripTags(decodeEntities(raw)).trim();
  }
};
```

**Purpose:** Compare text content, not JSON structure.

**Steps:**
1. Parse EditorJS JSON
2. Extract text from all blocks
3. Decode HTML entities
4. Strip HTML tags
5. Normalize whitespace

---

## Field Comparison Patterns

### Pattern 1: Direct Equality

**Use Case:** Simple scalar fields (string, number, boolean)

```typescript
if (local.name !== remote.name) {
  changes.push(this.createFieldChange("name", remote.name, local.name));
}
```

### Pattern 2: Normalized Equality

**Use Case:** Complex objects or arrays that need normalization

```typescript
const localNormalized = this.normalize(local.field);
const remoteNormalized = this.normalize(remote.field);

if (!this.equals(localNormalized, remoteNormalized)) {
  changes.push(
    this.createFieldChange(
      "field",
      remoteNormalized,
      localNormalized,
      "Field description"
    )
  );
}
```

### Pattern 3: Map-Based Comparison

**Use Case:** Arrays of objects with unique keys

```typescript
const localMap = new Map(local.items.map((item) => [item.key, item]));
const remoteMap = new Map(remote.items.map((item) => [item.key, item]));

const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);

for (const key of allKeys) {
  const localItem = localMap.get(key);
  const remoteItem = remoteMap.get(key);

  if (!localItem && remoteItem) {
    changes.push(
      this.createFieldChange(
        `items.${key}`,
        undefined,
        remoteItem,
        `Item "${key}" will be added`
      )
    );
  } else if (localItem && !remoteItem) {
    changes.push(
      this.createFieldChange(
        `items.${key}`,
        localItem,
        undefined,
        `Item "${key}" will be removed`
      )
    );
  } else if (localItem && remoteItem) {
    // Deep comparison
    if (!this.equalsItem(localItem, remoteItem)) {
      changes.push(
        this.createFieldChange(
          `items.${key}`,
          this.normalize(remoteItem),
          this.normalize(localItem),
          `Item "${key}" changed`
        )
      );
    }
  }
}
```

**Example:** Product variants, channel listings, attributes

### Pattern 4: Recursive Comparison

**Use Case:** Nested hierarchical structures

```typescript
private compareSubcategories(local: Subcategory[], remote: Subcategory[]): DiffChange[] {
  const changes: DiffChange[] = [];

  for (const localSub of local) {
    const remoteSub = remote.find((r) => r.slug === localSub.slug);
    
    if (remoteSub) {
      // Recursively compare nested subcategories
      const nestedChanges = this.compareSubcategoryStructure(localSub, remoteSub);
      changes.push(...nestedChanges);
    }
  }

  return changes;
}
```

**Example:** Category subcategories, menu items

---

## Complex Entity Handling

### Product Variants

**Challenge:** Products have nested variants with their own SKUs and channel listings.

**Strategy:**

1. **Map by SKU** (not array index)
2. **Deduplicate** by picking richer variant
3. **Compare recursively** (variant name, attributes, channel listings)

**Code:** `src/core/diff/comparators/product-comparator.ts:177-227`

```typescript
const pickRicher = (a: ProductVariantInput, b: ProductVariantInput) => {
  const aLen = Array.isArray(a.channelListings) ? a.channelListings.length : 0;
  const bLen = Array.isArray(b.channelListings) ? b.channelListings.length : 0;
  return bLen > aLen ? b : a;
};

const localVariantMap = new Map<string, ProductVariantInput>();
for (const v of localVariants) {
  const existing = localVariantMap.get(v.sku);
  localVariantMap.set(v.sku, existing ? pickRicher(existing, v) : v);
}

// Same for remote variants

const allVariantSkus = new Set([...localVariantMap.keys(), ...remoteVariantMap.keys()]);

for (const sku of allVariantSkus) {
  const localVariant = localVariantMap.get(sku);
  const remoteVariant = remoteVariantMap.get(sku);

  if (!localVariant && remoteVariant) {
    changes.push(/* variant added */);
  } else if (localVariant && !remoteVariant) {
    changes.push(/* variant removed */);
  } else if (localVariant && remoteVariant) {
    const variantChanges = this.compareVariants(localVariant, remoteVariant, sku);
    changes.push(...variantChanges);
  }
}
```

### Category Subcategories

**Challenge:** Categories have recursive subcategory hierarchies.

**Strategy:**

1. **Compare top-level categories** (standard algorithm)
2. **Recursively compare subcategories** within each category
3. **Track path** for nested changes

**Code:** `src/core/diff/comparators/category-comparator.ts:121-196`

```typescript
private compareSubcategories(
  local: readonly Subcategory[],
  remote: readonly Subcategory[]
): DiffChange[] {
  const changes: DiffChange[] = [];

  // Map by slug
  const localSubcatMap = new Map(local.map((subcat) => [subcat.slug, subcat]));
  const remoteSubcatMap = new Map(remote.map((subcat) => [subcat.slug, subcat]));

  // Find added subcategories
  for (const localSubcat of local) {
    if (!remoteSubcatMap.has(localSubcat.slug)) {
      changes.push(/* added */);
    } else {
      // Recursively compare
      const remoteSubcat = remoteSubcatMap.get(localSubcat.slug)!;
      const nestedChanges = this.compareSubcategoryStructure(localSubcat, remoteSubcat);
      changes.push(...nestedChanges);
    }
  }

  // Find removed subcategories
  for (const remoteSubcat of remote) {
    if (!localSubcatMap.has(remoteSubcat.slug)) {
      changes.push(/* removed */);
    }
  }

  return changes;
}
```

### Channel Listings

**Challenge:** Products and variants have per-channel pricing and settings.

**Strategy:**

1. **Map by channel** (not array index)
2. **Normalize** (sort, remove undefined)
3. **Compare settings** (pricing, visibility, etc.)

**Code:** `src/core/diff/comparators/product-comparator.ts:108-146`

```typescript
const localChannelListingMap = new Map(localChannelListings.map((c) => [c.channel, c]));
const remoteChannelListingMap = new Map(remoteChannelListings.map((c) => [c.channel, c]));

const allChannels = new Set([
  ...localChannelListingMap.keys(),
  ...remoteChannelListingMap.keys(),
]);

for (const channel of allChannels) {
  const localChannelListing = localChannelListingMap.get(channel);
  const remoteChannelListing = remoteChannelListingMap.get(channel);

  if (!localChannelListing && remoteChannelListing) {
    changes.push(/* channel added */);
  } else if (localChannelListing && !remoteChannelListing) {
    changes.push(/* channel removed */);
  } else if (localChannelListing && remoteChannelListing) {
    if (!this.equalsChannelListing(localChannelListing, remoteChannelListing)) {
      changes.push(
        this.createFieldChange(
          `channels.${channel}`,
          this.normalizeChannelListing(remoteChannelListing),
          this.normalizeChannelListing(localChannelListing),
          `Channel "${channel}" settings changed`
        )
      );
    }
  }
}
```

---

## Diff Results and Types

### DiffOperation

**Location:** `src/core/diff/types.ts:4`

```typescript
export type DiffOperation = "CREATE" | "UPDATE" | "DELETE";
```

**Operations:**
- `CREATE` - Entity exists locally but not remotely
- `UPDATE` - Entity exists in both but differs
- `DELETE` - Entity exists remotely but not locally (detected but not executed)

### EntityType

**Location:** `src/core/diff/types.ts:9-23`

```typescript
export type EntityType =
  | "Product Types"
  | "Products"
  | "Channels"
  | "Page Types"
  | "Categories"
  | "Collections"
  | "Menus"
  | "Models"
  | "Shop Settings"
  | "Warehouses"
  | "TaxClasses"
  | "Shipping Zones"
  | "Attributes";
```

### DiffChange

**Location:** `src/core/diff/types.ts:28-37`

```typescript
export interface DiffChange {
  readonly field: string;           // Field name (e.g., "name", "attributes.color")
  readonly currentValue: unknown;   // Current value in remote Saleor
  readonly desiredValue: unknown;   // Desired value from local config
  readonly description?: string;    // Optional human-readable description
}
```

**Example:**
```typescript
{
  field: "name",
  currentValue: "Old Product Name",
  desiredValue: "New Product Name",
  description: "Product name changed"
}
```

### DiffResult

**Location:** `src/core/diff/types.ts:43-56`

```typescript
export interface DiffResult<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly operation: DiffOperation;  // CREATE | UPDATE | DELETE
  readonly entityType: EntityType;    // "Products", "Categories", etc.
  readonly entityName: string;        // Unique identifier (slug or name)
  readonly current?: T;               // Current state (for UPDATE/DELETE)
  readonly desired?: T;               // Desired state (for CREATE/UPDATE)
  readonly changes?: readonly DiffChange[];  // Field changes (for UPDATE)
}
```

**CREATE Example:**
```typescript
{
  operation: "CREATE",
  entityType: "Products",
  entityName: "new-product",
  desired: { name: "New Product", slug: "new-product", ... }
}
```

**UPDATE Example:**
```typescript
{
  operation: "UPDATE",
  entityType: "Products",
  entityName: "existing-product",
  current: { name: "Old Name", ... },
  desired: { name: "New Name", ... },
  changes: [
    { field: "name", currentValue: "Old Name", desiredValue: "New Name" }
  ]
}
```

**DELETE Example:**
```typescript
{
  operation: "DELETE",
  entityType: "Products",
  entityName: "removed-product",
  current: { name: "Removed Product", ... }
}
```

### DiffSummary

**Location:** `src/core/diff/types.ts:61-72`

```typescript
export interface DiffSummary {
  readonly totalChanges: number;           // Total number of changes
  readonly creates: number;                // Number of CREATE operations
  readonly updates: number;                // Number of UPDATE operations
  readonly deletes: number;                // Number of DELETE operations
  readonly results: readonly DiffResult[]; // All diff results
}
```

**Example:**
```typescript
{
  totalChanges: 15,
  creates: 5,
  updates: 8,
  deletes: 2,
  results: [/* array of DiffResult */]
}
```

---

## Testing Patterns

### Test File Structure

Each comparator has corresponding tests:

```
src/core/diff/comparators/
├── product-comparator.ts
├── product-comparator.test.ts
├── category-comparator.ts
├── category-comparator.test.ts
└── ...
```

### Common Test Patterns

#### 1. Basic CREATE Detection

```typescript
describe("ProductComparator", () => {
  it("should detect products to create", () => {
    const comparator = new ProductComparator();
    
    const local = [
      { name: "Product A", slug: "product-a" },
      { name: "Product B", slug: "product-b" },
    ];
    
    const remote = [
      { name: "Product A", slug: "product-a" },
    ];
    
    const results = comparator.compare(local, remote);
    
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      operation: "CREATE",
      entityType: "Products",
      entityName: "product-b",
      desired: expect.objectContaining({ slug: "product-b" }),
    });
  });
});
```

#### 2. Basic UPDATE Detection

```typescript
it("should detect products to update", () => {
  const comparator = new ProductComparator();
  
  const local = [
    { name: "Updated Name", slug: "product-a" },
  ];
  
  const remote = [
    { name: "Old Name", slug: "product-a" },
  ];
  
  const results = comparator.compare(local, remote);
  
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({
    operation: "UPDATE",
    entityType: "Products",
    entityName: "product-a",
    changes: expect.arrayContaining([
      expect.objectContaining({
        field: "name",
        currentValue: "Old Name",
        desiredValue: "Updated Name",
      }),
    ]),
  });
});
```

#### 3. Basic DELETE Detection

```typescript
it("should detect products to delete", () => {
  const comparator = new ProductComparator();
  
  const local = [
    { name: "Product A", slug: "product-a" },
  ];
  
  const remote = [
    { name: "Product A", slug: "product-a" },
    { name: "Product B", slug: "product-b" },
  ];
  
  const results = comparator.compare(local, remote);
  
  expect(results).toHaveLength(1);
  expect(results[0]).toMatchObject({
    operation: "DELETE",
    entityType: "Products",
    entityName: "product-b",
    current: expect.objectContaining({ slug: "product-b" }),
  });
});
```

#### 4. No Changes Detection

```typescript
it("should return empty array when no changes", () => {
  const comparator = new ProductComparator();
  
  const entities = [
    { name: "Product A", slug: "product-a" },
  ];
  
  const results = comparator.compare(entities, entities);
  
  expect(results).toHaveLength(0);
});
```

#### 5. Deduplication Testing

```typescript
it("should deduplicate remote entities with warning", () => {
  const comparator = new ProductComparator();
  
  const local = [
    { name: "Product A", slug: "product-a" },
  ];
  
  const remote = [
    { name: "Product A", slug: "product-a", id: "1" },
    { name: "Product A", slug: "product-a", id: "2" }, // Duplicate
  ];
  
  const warnSpy = vi.spyOn(logger, "warn");
  
  const results = comparator.compare(local, remote);
  
  expect(warnSpy).toHaveBeenCalledWith(
    expect.stringContaining("Duplicate Products detected")
  );
  expect(results).toHaveLength(0); // No changes because first occurrence matches
});
```

#### 6. Complex Field Comparison

```typescript
it("should detect variant changes", () => {
  const comparator = new ProductComparator();
  
  const local = [
    {
      name: "Product A",
      slug: "product-a",
      variants: [
        { sku: "VAR-001", name: "Variant 1" },
      ],
    },
  ];
  
  const remote = [
    {
      name: "Product A",
      slug: "product-a",
      variants: [
        { sku: "VAR-001", name: "Old Variant Name" },
      ],
    },
  ];
  
  const results = comparator.compare(local, remote);
  
  expect(results).toHaveLength(1);
  expect(results[0].changes).toContainEqual(
    expect.objectContaining({
      field: expect.stringMatching(/^variants\.VAR-001/),
    })
  );
});
```

---

## Serena Navigation

### Finding Comparators

**Start with overview:**
```bash
list_dir("src/core/diff/comparators", recursive=False)
```

**Result:**
```
- base-comparator.ts
- product-comparator.ts
- category-comparator.ts
- channel-comparator.ts
- ...
```

**Get comparator structure:**
```bash
get_symbols_overview("src/core/diff/comparators/product-comparator.ts")
```

**Result:**
```
- ProductComparator (class)
- ProductEntity (type)
```

**See all methods:**
```bash
find_symbol("ProductComparator", depth=1, include_body=False, relative_path="src/core/diff/comparators")
```

**Result:**
```
- compare()
- compareEntityFields()
- compareVariants()
- normalizeChannelListing()
- ...
```

**Read specific method:**
```bash
find_symbol("ProductComparator/compareEntityFields", include_body=True, relative_path="src/core/diff/comparators")
```

### Finding Comparator Usage

**Find where comparator is used:**
```bash
find_referencing_symbols("ProductComparator", "src/core/diff/comparators/product-comparator.ts")
```

**Result:**
```
- DiffService/createComparators (src/core/diff/service.ts:294)
- ProductComparator tests (src/core/diff/comparators/product-comparator.test.ts)
```

### Finding DiffService

**See DiffService structure:**
```bash
find_symbol("DiffService", depth=1, include_body=False, relative_path="src/core/diff")
```

**Result:**
```
- compare()
- compareForIntrospect()
- performComparisons()
- createComparators()
- ...
```

**Read comparison execution:**
```bash
find_symbol("DiffService/performComparisons", include_body=True, relative_path="src/core/diff")
```

### Common Searches

**Find all comparators:**
```bash
find_symbol("Comparator", substring_matching=True, relative_path="src/core/diff/comparators")
```

**Find comparison logic:**
```bash
search_for_pattern("compare\\(", relative_path="src/core/diff/comparators")
```

**Find deduplication usage:**
```bash
search_for_pattern("deduplicateEntities", relative_path="src/core/diff/comparators")
```

**Find normalization methods:**
```bash
search_for_pattern("normalize", relative_path="src/core/diff/comparators")
```

---

## Best Practices

### 1. Always Validate Unique Identifiers

```typescript
compare(local: readonly EntityType[], remote: readonly EntityType[]): readonly DiffResult[] {
  // ALWAYS validate first
  this.validateUniqueIdentifiers(local);
  this.validateUniqueIdentifiers(remote);
  
  // ... rest of comparison
}
```

**Why:** Fail fast on invalid data.

### 2. Deduplicate Remote State

```typescript
// DON'T do this:
const remoteByName = this.createEntityMap(remote);

// DO this:
const deduplicatedRemote = this.deduplicateEntities(remote);
const remoteByName = this.createEntityMap(deduplicatedRemote);
```

**Why:** Saleor can have duplicate entities.

### 3. Use Maps for Lookups

```typescript
// DON'T do this:
for (const localEntity of local) {
  const remoteEntity = remote.find((r) => r.slug === localEntity.slug);  // O(n²)
}

// DO this:
const remoteByName = this.createEntityMap(remote);  // O(n)
for (const localEntity of local) {
  const remoteEntity = remoteByName.get(this.getEntityName(localEntity));  // O(1)
}
```

**Why:** O(n) vs O(n²) performance.

### 4. Normalize Before Comparing

```typescript
// DON'T do this:
if (local.field !== remote.field) {
  changes.push(...);
}

// DO this:
const localNormalized = this.normalize(local.field);
const remoteNormalized = this.normalize(remote.field);
if (!this.equals(localNormalized, remoteNormalized)) {
  changes.push(...);
}
```

**Why:** Avoids false positives from formatting differences.

### 5. Handle Undefined and Null

```typescript
// DON'T do this:
if (local.field !== remote.field) {
  changes.push(...);
}

// DO this:
const localValue = local.field ?? null;
const remoteValue = remote.field ?? null;
if (localValue !== remoteValue) {
  changes.push(...);
}
```

**Why:** `undefined`, `null`, and missing fields should be treated consistently.

### 6. Provide Descriptive Change Messages

```typescript
// DON'T do this:
this.createFieldChange("variants", remote.variants, local.variants);

// DO this:
this.createFieldChange(
  `variants.${sku}`,
  remoteVariant,
  localVariant,
  `Variant "${sku}" name changed from "${remoteVariant.name}" to "${localVariant.name}"`
);
```

**Why:** Users need to understand what changed.

### 7. Test All Edge Cases

**Essential test cases:**
- Empty arrays
- Single entity
- Multiple entities
- Duplicate entities (remote)
- Missing fields
- Null vs undefined
- Complex nested structures
- Order-sensitive vs order-insensitive arrays

### 8. Use Consistent Entity Identifiers

```typescript
protected getEntityName(entity: EntityType): string {
  // Prefer slug over name for entities that have slugs
  return entity.slug ?? entity.name;
}
```

**Why:** Slugs are more stable than names.

### 9. Document Complex Normalization

```typescript
/**
 * Normalizes channel listing for comparison.
 * 
 * - Sorts arrays by channel name (order-insensitive)
 * - Removes undefined values
 * - Ensures consistent structure
 * 
 * @param listing Channel listing to normalize
 * @returns Normalized channel listing
 */
private normalizeChannelListing(listing: ChannelListing): NormalizedChannelListing {
  // ...
}
```

**Why:** Complex normalization logic needs explanation.

### 10. Keep Comparators Independent

**DON'T:**
```typescript
class ProductComparator {
  constructor(private categoryComparator: CategoryComparator) {}
}
```

**DO:**
```typescript
class ProductComparator {
  // No dependencies on other comparators
}
```

**Why:** Comparators should be independently testable and reusable.

---

## Summary

The Diff Engine is a sophisticated comparison system that:

1. **Detects changes** between local YAML and remote Saleor state
2. **Uses Strategy Pattern** for entity-specific comparison logic
3. **Provides Template Method** pattern for common operations
4. **Handles corrupted state** gracefully with deduplication
5. **Normalizes entities** for accurate comparison
6. **Executes concurrently** for performance
7. **Provides detailed change information** for users

**Key Components:**
- `BaseEntityComparator` - Abstract base class with common logic
- Entity-specific comparators (Product, Category, Channel, etc.)
- `DiffService` - Orchestrates comparison execution
- Diff types (DiffResult, DiffChange, DiffSummary)

**Critical Features:**
- Deduplication of remote state
- Normalization strategies
- Complex entity handling (variants, subcategories)
- Concurrent execution
- Comprehensive testing

**For Serena Navigation:**
- Use `get_symbols_overview()` to understand comparator structure
- Use `find_symbol()` with depth=1 to see all methods
- Use `find_referencing_symbols()` to find usage
- Read selectively with `include_body=True` for specific methods

This architecture ensures accurate, performant, and resilient change detection across all Saleor entity types.