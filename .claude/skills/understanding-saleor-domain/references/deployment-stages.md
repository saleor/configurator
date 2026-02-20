# Deployment Stages Reference

Complete reference for the deployment pipeline stages and their dependencies.
Source: `src/core/deployment/stages.ts` → `getAllStages()`

## Stage Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│  Stage  1: VALIDATION                                           │
│  └─► Pre-flight checks, schema validation                      │
├─────────────────────────────────────────────────────────────────┤
│  Stage  2: SHOP SETTINGS                                        │
│  └─► Global store configuration                                │
├─────────────────────────────────────────────────────────────────┤
│  Stage  3: TAX CLASSES                                          │
│  └─► Tax classes (deployed early, referenced by other entities) │
├─────────────────────────────────────────────────────────────────┤
│  Stage  4: ATTRIBUTES                                           │
│  └─► Shared attribute definitions                               │
├─────────────────────────────────────────────────────────────────┤
│  Stage  5: PRODUCT TYPES                                        │
│  └─► Product templates (depends on attributes)                  │
├─────────────────────────────────────────────────────────────────┤
│  Stage  6: CHANNELS                                             │
│  └─► Sales channels                                             │
├─────────────────────────────────────────────────────────────────┤
│  Stage  7: PAGE TYPES                                           │
│  └─► CMS page templates                                        │
├─────────────────────────────────────────────────────────────────┤
│  Stage  8: MODEL TYPES                                          │
│  └─► Templates for custom data models                          │
├─────────────────────────────────────────────────────────────────┤
│  Stage  9: CATEGORIES                                           │
│  └─► Product hierarchy                                          │
├─────────────────────────────────────────────────────────────────┤
│  Stage 10: COLLECTIONS                                          │
│  └─► Product groupings (after categories)                       │
├─────────────────────────────────────────────────────────────────┤
│  Stage 11: MENUS                                                │
│  └─► Navigation (references categories, collections)            │
├─────────────────────────────────────────────────────────────────┤
│  Stage 12: MODELS                                               │
│  └─► Custom data models (after model types)                     │
├─────────────────────────────────────────────────────────────────┤
│  Stage 13: WAREHOUSES                                           │
│  └─► Fulfillment locations                                      │
├─────────────────────────────────────────────────────────────────┤
│  Stage 14: SHIPPING ZONES                                       │
│  └─► Geographic shipping rules                                  │
├─────────────────────────────────────────────────────────────────┤
│  Stage 15: ATTRIBUTE CHOICES PREFLIGHT                          │
│  └─► Prepares attribute choices for products                    │
├─────────────────────────────────────────────────────────────────┤
│  Stage 16: PRODUCTS                                             │
│  └─► Full product catalog (depends on types, categories, attrs) │
└─────────────────────────────────────────────────────────────────┘
```

## Dependency Graph

```
Validation
    │
Shop Settings
    │
Tax Classes ─────────────────────────────────┐
    │                                        │
Attributes ──────┬───────────────────────────┤
    │            │                           │
Product Types ◄──┘                           │
    │                                        │
Channels                                     │
    │                                        │
Page Types                                   │
    │                                        │
Model Types                                  │
    │                                        │
Categories ──────────────────────────────────┤
    │                                        │
Collections (after categories) ──────────────┤
    │                                        │
Menus (refs categories, collections) ────────┤
    │                                        │
Models (after model types)                   │
    │                                        │
Warehouses                                   │
    │                                        │
Shipping Zones                               │
    │                                        │
Attr Choices Preflight ──────────────────────┤
    │                                        │
Products ◄───────────────────────────────────┘
```

## Stage Details

### Stage 1: Validation

**Purpose**: Pre-flight checks before any changes

**Operations**:
- Schema validation against Zod schemas
- Duplicate identifier detection
- Required field validation
- Reference integrity checking

**Failures**: Abort entire deployment

### Stage 2: Shop Settings

**Purpose**: Configure global store settings

**Includes**:
- Store name and description
- Default currency and country
- Weight unit
- Company information

**Dependencies**: None (first mutable stage)

### Stage 3: Tax Classes

**Purpose**: Configure tax classes early since other entities may reference them

**Includes**:
- Tax class names
- Country-specific rates

**Dependencies**: None

### Stage 4: Attributes

**Purpose**: Define reusable attribute definitions

**Includes**:
- Attribute name and slug
- Input type (dropdown, text, etc.)
- Values (for selectable types)
- Entity type (for REFERENCE type)

**Dependencies**: None

### Stage 5: Product Types

**Purpose**: Define product templates

**Includes**:
- Type name
- Product and variant attributes assigned
- Weight configuration
- Kind (normal, gift card)

**Dependencies**: Attributes (for assignment)

### Stage 6: Channels

**Purpose**: Configure sales channels

**Includes**:
- Channel name and slug
- Currency configuration
- Country allocation
- Warehouse assignments

**Dependencies**: None at this stage

### Stage 7: Page Types

**Purpose**: Define CMS page templates

**Includes**:
- Type name
- Page attributes assigned

**Dependencies**: Attributes (for assignment)

### Stage 8: Model Types

**Purpose**: Define templates for custom data models

**Dependencies**: None

### Stage 9: Categories

**Purpose**: Define product category hierarchy

**Includes**:
- Category name and slug
- Parent category (for hierarchy)
- Description and SEO metadata

**Dependencies**: Parent categories (self-referential)

### Stage 10: Collections

**Purpose**: Define product collections (after categories, as they may reference products)

**Dependencies**: Categories (indirect)

### Stage 11: Menus

**Purpose**: Configure navigation menus (after categories and collections, as they may reference them)

**Dependencies**: Categories, Collections

### Stage 12: Models

**Purpose**: Custom data models (after model types)

**Dependencies**: Model Types

### Stage 13: Warehouses

**Purpose**: Define fulfillment locations

**Dependencies**: None at this stage

### Stage 14: Shipping Zones

**Purpose**: Define geographic shipping rules

**Dependencies**: Channels (for pricing)

### Stage 15: Attribute Choices Preflight

**Purpose**: Prepare attribute choices needed for product creation

**Dependencies**: Attributes, Product Types

### Stage 16: Products

**Purpose**: Deploy full product catalog

**Includes**:
- Product name and slug
- Product type and category assignment
- Variants with pricing
- Attribute values
- Media/images

**Dependencies**: Product Types, Categories, Attributes, Attribute Choices

## Selective Deployment

Use `--include`, `--only`, and `--exclude` flags for partial deployments:

```bash
# Deploy only product types and products
pnpm dev deploy --include=productTypes,products [credentials]

# Deploy everything except menus
pnpm dev deploy --exclude=menus [credentials]

# Shorthand for include
pnpm dev deploy --only=channels,shop [credentials]
```

**Warning**: Selective deployment may fail if dependencies aren't met.

## Performance Considerations

| Stage | Typical Items | Chunk Size | Estimated Time |
|-------|--------------|------------|----------------|
| Products | 100-10000 | 10 | 2-30 min |
| Categories | 10-500 | 10 | 1-5 min |
| Attributes | 10-100 | 10 | < 1 min |
| Others | Variable | 10 | < 1 min |
