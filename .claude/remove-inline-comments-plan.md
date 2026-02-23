# Remove Inline Comments — Implementation Plan

All 100 inline behavioral comments across 4 files need to be addressed.
`deploy.ts` and `attribute-cache.ts` are already clean.

## Strategy per comment type

| Action | Count | Approach |
|--------|-------|----------|
| **Remove** (self-documenting) | 61 | Delete the comment. No code change. |
| **Extract method** | 24 | Create a private method, move logic, delete comment. |
| **Rename variable** | 6 | Rename to make intent clear, delete comment. |
| **Keep/Condense** | 9 | Domain knowledge or ordering rationale — shorten to 1 line or move to JSDoc. |

---

## File 1: `src/modules/page-type/page-type-service.ts`

### Remove (self-documenting) — 8 items

| Line | Comment | Why removable |
|------|---------|---------------|
| 73 | `// Filter out attributes that are referenced by name` | `isReferencedAttribute` filter is self-documenting |
| 83 | `// Filter out attributes that are already assigned` | `unassignedNames` variable + filter expression is clear |
| 115 | `// No cache provided, all names are cache misses` | `else { cacheMisses.push(...unassignedNames) }` is obvious |
| 210 | `// Create new attributes` | `bootstrapAttributes` call is self-describing |
| 229 | `// Resolve referenced attributes (cache-first with API fallback)` | Method name says it all |
| 250 | `// Combine new and referenced attribute IDs` | Spread expression is clear |
| 253 | `// Filter out already assigned attributes` | Method name `filterOutAssignedAttributes` is clear |
| 197 | `// check if the page type has the attributes already` | Filter expression is readable |

### Extract method — 5 items

| Line | Comment | Proposed method |
|------|---------|-----------------|
| 96 | `// Step 1: Try to resolve from cache if available` | `resolveFromCache(unassignedNames, cache): { resolvedIds, cacheMisses }` |
| 119 | `// Step 2: Fallback to API for cache misses` | `resolveFromApi(cacheMisses, cache, entityName): string[]` |
| 134 | `// Check for any unresolved cache misses and validate` | `validateUnresolvedAttributes(names, cache, entityName)` |
| 176 | `// Check if this is an update input (has attributes)` | Type guard: `hasAttributes(input): input is PageTypeUpdateInput` |
| 183 | `// Validate REFERENCE attributes have entityType` | `validateReferenceAttributesHaveEntityType(attrs, name)` |

### Rename variable — 0

### Keep/Condense — 1

| Line | Comment | Action |
|------|---------|--------|
| 215 | `// Only create new attributes, not referenced ones` | Extract to named variable: `const inlineAttributeInputs = attributesToCreate.filter((a) => "name" in a)` then remove comment |

---

## File 2: `src/modules/product-type/product-type-service.ts`

### Remove (self-documenting) — 13 items

| Line | Comment |
|------|---------|
| 204 | `// Cache-first resolution: check cache, then fallback to API for misses` (JSDoc already says this) |
| 237 | `// No cache provided, all names are cache misses` |
| 249 | `// Filter cache misses to only those that aren't already assigned` (`unassignedCacheMisses` is clear) |
| 274 | `// Build lookup maps from resolved data` |
| 291 | `// If cache is available, use validateAttributeReference for detailed error messages` |
| 307 | `// Fallback to generic error if no cache or no specific error generated` |
| 316 | `// Build variantSelection map and validate input types (fail-fast)` |
| 324 | `// Return attribute assignments with variantSelection (only unassigned attributes)` |
| 385 | `// Update variantSelection on already-assigned attributes (VARIANT type only)` |
| 401 | `// Check if repository supports updates (optional method)` |
| 407 | `// Get already-assigned variant attributes with their IDs` |
| 413 | `// Build map of desired variantSelection from input (for both inline and referenced)` |
| 425 | `// If the attribute is not in the input, skip it (no desired change)` |

### Extract method — 6 items

| Line | Comment | Proposed method |
|------|---------|-----------------|
| 209 | `// Step 1: Try to resolve from cache if available` | `resolveReferencedAttributesFromCache(names, cache)` (shared with page-type) |
| 214 | `// Create a minimal Attribute object from cached data` | `cachedAttributeToAttributeMeta(cached): Attribute` |
| 252 | `// Step 2: Fallback to API for cache misses that need to be assigned` | `resolveUnassignedAttributesFromApi(names, productType)` |
| 281 | `// Fail-fast: validate that all unassigned referenced attributes were resolved` | `assertAllReferencedAttributesResolved(...)` |
| 550 | `// Validate REFERENCE attributes have entityType` | `validateReferenceAttributesHaveEntityType(attrs, name)` (shared with page-type) |
| 565 | `// Validate variantSelection is only used on variant attributes with supported input types` | `validateInlineVariantSelectionInputTypes(attrs, name)` |

### Rename variable — 2 items

| Line | Comment | Rename to |
|------|---------|-----------|
| 241 | `// Calculate already-assigned attributes early (needed for validation)` | `alreadyAssignedAttributeNames` |
| 355 | `// Build variantSelection map for inline (non-referenced) attributes` | `inlineAttributeVariantSelectionMap` |

### Keep/Condense — 2 items

| Line | Comment | Action |
|------|---------|--------|
| 416-418 | Three-line block about finding attributes that need updating | Keep domain note about Saleor API not returning variantSelection state. Move to JSDoc on `updateExistingAttributeAssignments`. Remove the rest. |
| 428-432 | Multi-line block about Saleor API limitation | Same — move to JSDoc on `updateExistingAttributeAssignments` |
| 522 | `// Reuse existing global attribute from previous deployment` | Rename var to `existingGlobalAttribute`, remove comment |
| 515, 533 | `// Check if attribute already exists globally` / `// Create the attribute since it doesn't exist` | Remove — self-documenting flow |
| 361 | `// Map created attributes to assignment inputs with variantSelection` | Remove — `createdAttributeAssignments` name is clear |

---

## File 3: `src/modules/config/config-service.ts`

### Remove (self-documenting) — 18 items

| Line | Comment |
|------|---------|
| 55 | `// Split attributes into productAttributes and contentAttributes sections` |
| 64 | `// Ensure attributes appear before productTypes in YAML ordering` |
| 75 | `// Continue without global attributes - they'll be inline in types` (logger.error says this) |
| 119 | `// Desired order: global attributes appear before productTypes/modelTypes` (JSDoc says this) |
| 138 | `// Clear and assign back in order` |
| 292 | `// Only include variantSelection when true (omit when false for cleaner YAML)` (JSDoc duplicate) |
| 360 | `// Track seen names for deduplication` |
| 375 | `// Build the attribute without the type field` (JSDoc says this) |
| 393 | `// Split by type and deduplicate` |
| 461 | `// Initialize all categories in the map` |
| 473 | `// Top-level category` |
| 476 | `// Subcategory` |
| 535 | `// Filter country rates to only include rates that belong to this tax class` |
| 690 | `// Convert all attribute definitions in product/page types to references` |
| 709 | `// Preserve variantSelection when true (only applies to variant attributes)` |
| 718 | `// Default to include all sections if no selective options provided` |
| 777 | `// Normalize attribute references to prevent duplication errors during deployment` |
| 887 | `// Multi-value attribute` |

### Extract method — 4 items

| Line | Comment | Proposed method |
|------|---------|-----------------|
| 469 | `// Build the tree structure` | `buildCategoryTree(categories, categoryMap): SaleorConfig["categories"]` |
| 643 | `// Since we just created the config from raw data, all attributes are FullAttributes` | `extractProductTypesWithFullAttributes(config)` — typed cast helper |
| 657 | `// Collect all attributes across product types and page types` | `buildAttributeUsageMap(productTypes, pageTypes)` |
| 661+676 | `// Track attributes from product types` / `// Track attributes from page types` | Folded into `buildAttributeUsageMap` above |

### Rename variable — 2 items

| Line | Comment | Fix |
|------|---------|-----|
| 455 | `// Sort categories by level to ensure parents are processed before children` | `const byAscendingLevel = (a, b) => (a.level ?? 0) - (b.level ?? 0)` |
| 961 | `// Keep only listings with a defined numeric price to satisfy schema` | `const hasNumericPrice = (l) => typeof l.price === "number"` |

### Keep/Condense — 2 items

| Line | Comment | Action |
|------|---------|--------|
| 67 | `// Only catch expected errors from attribute mapping` | Condense to 1 line: `// Only UnsupportedInputTypeError is expected; all others propagate` |
| 135 | `// Legacy attributes section (for backward compatibility during migration)` | Shorten to `// Legacy: kept for backward compatibility` |
| 912 | `// Reference existing attribute by name` | Remove — but add `logger.warn` for the `|| ""` fallback |
| 944 | `// Preserve empty SKU as empty string (don't default to variant ID)` | Keep — domain rule. Shorten to `// Empty SKU is valid; do not substitute variant ID` |

---

## File 4: `src/core/deployment/stages.ts`

### Remove (self-documenting) — 22 items

| Line | Comment |
|------|---------|
| 37 | `// Load the configuration to validate it` |
| 79 | `// Pass attribute cache to ProductTypeService for fast reference resolution` |
| 85-86 | `// Process each product type in the chunk` |
| 163 | `// Fetch existing attributes` |
| 169 | `// Sequential processing for small configs` |
| 210 | `// Bulk processing for large configs` |
| 238 | `// Fetch all attributes to cache` |
| 302 | `// Group by type` |
| 329 | `// Report cache stats` |
| 335 | `// Throw if there were any failures` |
| 345 | `// Check for any attribute-related changes across all attribute entity types` |
| 404 | `// Pass attribute cache for fast content attribute resolution` |
| 461 | `// Pass attribute cache for fast content attribute resolution` |
| 779 | `// Get only the products that need to be changed based on diff results` |
| 787 | `// Extract product slugs that need to be processed` |
| 791 | `// Filter config to only process changed products` |

### Extract method — 9 items

| Line | Comment | Proposed method |
|------|---------|-----------------|
| 265+279+293 | `// 1. Process productAttributes` / `// 2. Process contentAttributes` / `// 3. Process legacy attributes` | Already use `processGlobalAttributes` — just remove the step-number comments |
| 363 | `// Sync per-channel tax configuration if provided in config` | `syncChannelTaxConfigurations(context, channels)` |
| 562-568 | Size-adaptive strategy comments in modelsStage | `bootstrapModelsAdaptively(context, models)` |
| 700 | `// Collect attribute values per attribute name` | `collectAttributeValuesByName(products): Map<string, Set<string>>` |
| 720 | `// For each attribute, add missing choices if any` | `ensureAttributeChoicesExist(context, existing, valuesByAttr)` |
| 806-817 | Size-adaptive strategy comments in productsStage | `bootstrapProductsAdaptively(context, products, options)` |

### Rename variable — 2 items

| Line | Comment | Fix |
|------|---------|-----|
| 723 | `// Only process attributes that support predefined choices` | Extract predicate: `const isChoiceAttribute = (attr) => choiceInputTypes.has(String(attr.inputType))` |
| 745 | `// Re-fetch updated attribute metadata for cache priming` | Rename `refreshed` → `refreshedAttributeMetadata` |

### Keep/Condense — 4 items (stage ordering)

| Lines | Comment | Action |
|-------|---------|--------|
| 121-123 | Skip logic rationale for productTypesStage | Move to JSDoc on `skip` method |
| 384-386 | Skip logic rationale for channelsStage | Move to JSDoc on `skip` method |
| 610-612 | Skip logic rationale for categoriesStage | Move to JSDoc on `skip` method |
| 840-854 | Stage ordering comments in `getAllStages()` | **Keep all 5** — these are non-obvious ordering dependency constraints. Optionally add a `STAGE_ORDER_RATIONALE` constant. |

---

## Shared extraction opportunities

Two methods can be shared between `PageTypeService` and `ProductTypeService`:

1. **`validateReferenceAttributesHaveEntityType(attributes, entityName)`** — identical validation loop in both services. Extract to a shared utility.
2. **Cache resolution pattern** — `resolveFromCache` / `resolveFromApi` split is structurally identical. Consider a shared `CacheFirstAttributeResolver` or shared functions.

---

## Implementation order

1. **Trivial removals first** (61 comments) — fastest, zero risk
2. **Variable renames** (6 items) — low risk
3. **Keep/Condense** (9 items) — low risk, mostly shortening
4. **Extract methods** (24 items) — medium risk, need tests to verify
5. **Shared extractions** (2 items) — highest risk, cross-file refactor

Run `pnpm test && pnpm build && pnpm check:ci` after each file.
