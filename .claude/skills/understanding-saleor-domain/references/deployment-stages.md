# Deployment Stages Reference

Complete reference for the deployment pipeline stages and their dependencies.

## Stage Execution Order

```
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT PIPELINE                      │
├─────────────────────────────────────────────────────────────┤
│  Stage 1: VALIDATION                                        │
│  └─► Pre-flight checks, schema validation                   │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: SHOP SETTINGS                                     │
│  └─► Global store configuration                             │
├─────────────────────────────────────────────────────────────┤
│  Stage 3: PRODUCT TYPES ◄─────────────────────────┐         │
│  └─► Product templates                            │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 4: PAGE TYPES                              │         │
│  └─► CMS page templates                           │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 5: ATTRIBUTES ◄────────────────────────────┤         │
│  └─► Shared attribute definitions                 │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 6: CATEGORIES                              │         │
│  └─► Product hierarchy                            │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 7: COLLECTIONS                             │         │
│  └─► Product groupings                            │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 8: WAREHOUSES                              │         │
│  └─► Fulfillment locations                        │         │
├───────────────────────────────────────────────────┼─────────┤
│  Stage 9: SHIPPING ZONES                          │         │
│  └─► Geographic shipping rules                    │         │
├───────────────────────────────────────────────────┴─────────┤
│  Stage 10: PRODUCTS                                         │
│  └─► Full product catalog (depends on types, categories)    │
├─────────────────────────────────────────────────────────────┤
│  Stage 11: TAX CONFIGURATION                                │
│  └─► Tax classes and rules                                  │
├─────────────────────────────────────────────────────────────┤
│  Stage 12: CHANNELS                                         │
│  └─► Sales channels                                         │
├─────────────────────────────────────────────────────────────┤
│  Stage 13: MENUS ◄──────────────────────────────────────────┤
│  └─► Navigation (may reference products)                    │
├─────────────────────────────────────────────────────────────┤
│  Stage 14: MODELS                                           │
│  └─► Custom data models                                     │
└─────────────────────────────────────────────────────────────┘
```

## Dependency Graph

```
Shop Settings
    │
    ├── Product Types ───┐
    │                    │
    ├── Page Types       │
    │                    │
    ├── Attributes ──────┤
    │                    │
    ├── Categories ──────┤
    │                    │
    ├── Collections      │
    │                    │
    ├── Warehouses       │
    │                    │
    ├── Shipping Zones   │
    │                    │
    └────────────────────┴──► Products
                                  │
    Tax Config ◄──────────────────┤
                                  │
    Channels ◄────────────────────┤
                                  │
    Menus ◄───────────────────────┘

    Models (independent)
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
- Default currency
- Default country
- Weight unit
- Company information

**Dependencies**: None (first mutable stage)

### Stage 3: Product Types

**Purpose**: Define product templates

**Includes**:
- Type name and slug
- Product attributes assigned
- Variant attributes assigned
- Weight configuration
- Kind (normal, gift card)

**Dependencies**: Attributes (for assignment)

### Stage 4: Page Types

**Purpose**: Define CMS page templates

**Includes**:
- Type name
- Page attributes assigned

**Dependencies**: Attributes (for assignment)

### Stage 5: Attributes

**Purpose**: Define reusable attribute definitions

**Includes**:
- Attribute name and slug
- Input type (dropdown, text, etc.)
- Values (for selectable types)
- Entity type (for REFERENCE type)

**Dependencies**: None

### Stage 6: Categories

**Purpose**: Define product category hierarchy

**Includes**:
- Category name and slug
- Parent category (for hierarchy)
- Description
- SEO metadata

**Dependencies**: Parent categories (self-referential)

### Stage 7: Collections

**Purpose**: Define product collections

**Includes**:
- Collection name and slug
- Description
- SEO metadata
- Background image

**Dependencies**: None (products assigned separately)

### Stage 8: Warehouses

**Purpose**: Define fulfillment locations

**Includes**:
- Warehouse name and slug
- Address information
- Shipping zones assignment

**Dependencies**: Shipping zones (for assignment)

### Stage 9: Shipping Zones

**Purpose**: Define geographic shipping rules

**Includes**:
- Zone name
- Countries covered
- Shipping methods
- Price configuration

**Dependencies**: Channels (for pricing)

### Stage 10: Products

**Purpose**: Deploy full product catalog

**Includes**:
- Product name and slug
- Product type assignment
- Category assignment
- Variants with pricing
- Attribute values
- Media/images

**Dependencies**: Product Types, Categories, Attributes

### Stage 11: Tax Configuration

**Purpose**: Configure tax classes and rules

**Includes**:
- Tax class names
- Country-specific rates
- Tax exemption rules

**Dependencies**: None (may apply to products/channels)

### Stage 12: Channels

**Purpose**: Configure sales channels

**Includes**:
- Channel name and slug
- Currency configuration
- Country allocation
- Warehouse assignments

**Dependencies**: Warehouses

### Stage 13: Menus

**Purpose**: Configure navigation menus

**Includes**:
- Menu name and slug
- Menu items (hierarchical)
- Links to categories/collections/products/pages

**Dependencies**: Categories, Collections, Products (for linking)

### Stage 14: Models

**Purpose**: Custom data models

**Includes**:
- Model definitions
- Field configurations

**Dependencies**: Varies by model definition

## Selective Deployment

Use `--include` and `--exclude` flags for partial deployments:

```bash
# Deploy only product types and products
pnpm deploy --include=productTypes,products

# Deploy everything except menus
pnpm deploy --exclude=menus
```

**Warning**: Selective deployment may fail if dependencies aren't met.

## Stage Failure Handling

**Default Behavior**: Stop on first failure

**Options**:
- `--continue-on-error`: Continue to next stage despite failures
- `--dry-run`: Preview changes without applying

**Rollback**: Manual intervention required (no automatic rollback)

## Performance Considerations

| Stage | Typical Items | Chunk Size | Estimated Time |
|-------|--------------|------------|----------------|
| Products | 100-10000 | 50 | 2-30 min |
| Categories | 10-500 | 50 | 1-5 min |
| Attributes | 10-100 | 50 | < 1 min |
| Others | Variable | 50 | < 1 min |
