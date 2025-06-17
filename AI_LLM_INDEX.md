# Saleor Configurator - AI/LLM Assistant Index

## Project Overview

The Saleor Configurator is a TypeScript-based infrastructure-as-code tool for managing Saleor e-commerce platform configurations. It enables declarative configuration management through YAML files, automating the setup and maintenance of Saleor instances.

### Core Purpose
- **Configuration as Code**: Define entire e-commerce setup in YAML
- **Idempotent Operations**: Safe to run multiple times
- **Dependency Management**: Handles entity relationships automatically
- **Multi-Environment Support**: Manage dev/staging/prod configurations

## Architecture Summary

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  YAML Config    │────▶│   Configurator   │────▶│  Saleor GraphQL │
│     Files       │     │    TypeScript    │     │      API        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
              ┌─────▼─────┐        ┌─────▼─────┐
              │  Services  │        │ Repositories│
              │  (Logic)   │        │  (GraphQL)  │
              └───────────┘        └─────────────┘
```

## Key Components

### 1. Core System (`/src/core/`)

#### Configurator (`configurator.ts`)
- **Purpose**: Main orchestrator for push/pull operations
- **Key Methods**:
  - `push()`: Apply configuration to Saleor
  - `pull()`: Retrieve current configuration
- **Execution Order**: Handles dependencies automatically

#### Service Container (`service-container.ts`)
- **Purpose**: Dependency injection container
- **Pattern**: Composition root pattern
- **Services**: All business logic services

### 2. Modules (`/src/modules/`)

Each module follows the same pattern:
- **Repository**: GraphQL operations
- **Service**: Business logic and orchestration
- **Types**: TypeScript interfaces

#### Available Modules

##### Shop (`/shop/`)
- Global store settings
- Default configurations
- Business rules

##### Channels (`/channel/`)
- Multi-channel setup
- Currency and country settings
- Channel-specific configurations

##### Product Management
- **Product Types** (`/product-type/`): Product schemas with attributes
- **Categories** (`/category/`): Hierarchical categorization
- **Products** (`/product/`): Actual product catalog
- **Collections** (`/collection/`): Product groupings

##### Logistics
- **Warehouses** (`/warehouse/`): Inventory locations
- **Shipping** (`/shipping/`): Zones and methods

##### Financial
- **Tax** (`/tax/`): Tax classes and configurations

##### Content
- **Page Types** (`/page-type/`): Content schemas
- **Attributes** (`/attribute/`): Reusable attribute definitions

### 3. Configuration Schema (`/src/modules/config/schema.ts`)

Uses Zod for runtime validation. Key schemas:

```typescript
// Main configuration structure
export const configSchema = z.object({
  shop: shopSchema.optional(),
  channels: z.array(channelSchema).optional(),
  productTypes: z.array(productTypeSchema).optional(),
  categories: z.array(categorySchema).optional(),
  warehouses: z.array(warehouseSchema).optional(),
  collections: z.array(collectionSchema).optional(),
  products: z.array(productSchema).optional(),
  shippingZones: z.array(shippingZoneSchema).optional(),
  taxClasses: z.array(taxClassSchema).optional(),
  // ... more entities
});
```

## YAML Configuration Structure

### Basic Template

```yaml
# Shop-level settings
shop:
  headerText: "Store Name"
  trackInventoryByDefault: true
  defaultWeightUnit: KG

# Define channels first (many entities depend on them)
channels:
  - name: "Main Channel"
    slug: "main"
    currencyCode: "USD"
    defaultCountry: "US"

# Product structure
productTypes:
  - name: "Physical Product"
    attributes:
      - name: "Size"
        inputType: DROPDOWN
        values:
          - name: "S"
          - name: "M"
          - name: "L"

# Categories (hierarchical)
categories:
  - name: "Clothing"
    subcategories:
      - name: "T-Shirts"

# Warehouses for inventory
warehouses:
  - name: "Main Warehouse"
    slug: "main-wh"
    address:
      streetAddress1: "123 Main St"
      city: "New York"
      postalCode: "10001"
      country: "US"

# Products (depends on types, categories, warehouses)
products:
  - name: "Basic T-Shirt"
    slug: "basic-tshirt"
    productTypeName: "Physical Product"
    categorySlug: "t-shirts"
    variants:
      - sku: "TSHIRT-001"
        stocks:
          - warehouseSlug: "main-wh"
            quantity: 100
```

## Entity Dependencies

### Dependency Graph
```
Shop Settings (no dependencies)
    │
    ├─→ Channels
    │      ├─→ Warehouses
    │      ├─→ Collections
    │      └─→ Shipping Zones
    │
    ├─→ Product Types ─→ Products
    │
    └─→ Categories ────→ Products
```

### Key Rules
1. **Channels** must exist before most other entities
2. **Product Types** must exist before products
3. **Categories** must exist before products can reference them
4. **Warehouses** must exist before product stock

## Common AI/LLM Tasks

### 1. Creating a Basic Store Configuration

```yaml
# Minimal viable configuration
shop:
  headerText: "My Store"

channels:
  - name: "Default"
    slug: "default"
    currencyCode: "USD"
    defaultCountry: "US"

productTypes:
  - name: "Simple Product"
    attributes: []

warehouses:
  - name: "Default Warehouse"
    slug: "default"
    address:
      streetAddress1: "123 Main St"
      city: "City"
      postalCode: "12345"
      country: "US"
```

### 2. Multi-Channel Setup

```yaml
channels:
  - name: "B2C US"
    slug: "b2c-us"
    currencyCode: "USD"
    defaultCountry: "US"
    
  - name: "B2C EU"
    slug: "b2c-eu"
    currencyCode: "EUR"
    defaultCountry: "DE"
    
  - name: "B2B"
    slug: "b2b"
    currencyCode: "USD"
    defaultCountry: "US"
    settings:
      allowUnpaidOrders: true
```

### 3. Complex Product with Variants

```yaml
productTypes:
  - name: "Apparel"
    attributes:
      - name: "Color"
        inputType: SWATCH
        values:
          - name: "Red"
          - name: "Blue"
      - name: "Size"
        inputType: DROPDOWN
        values:
          - name: "S"
          - name: "M"
          - name: "L"

products:
  - name: "Designer T-Shirt"
    slug: "designer-tshirt"
    productTypeName: "Apparel"
    variants:
      - sku: "DT-RED-S"
        attributes:
          - name: "Color"
            value: "Red"
          - name: "Size"
            value: "S"
        channelListings:
          - channelSlug: "b2c-us"
            price: 29.99
```

## Schema Validation Rules

### Required Fields by Entity

#### Channel
- `name`: string
- `slug`: string (unique)
- `currencyCode`: string (3-letter ISO)
- `defaultCountry`: string (2-letter ISO)

#### Product Type
- `name`: string
- `attributes`: array (can be empty)

#### Product
- `name`: string
- `slug`: string (unique)
- `productTypeName`: string (must exist)

#### Warehouse
- `name`: string
- `slug`: string (unique)
- `address.streetAddress1`: string
- `address.city`: string
- `address.postalCode`: string
- `address.country`: string (2-letter ISO)

### Attribute Input Types

```yaml
# Text inputs
- inputType: PLAIN_TEXT    # Single line
- inputType: RICH_TEXT     # Multi-line with formatting

# Numeric
- inputType: NUMERIC       # Numbers only

# Date/Time
- inputType: DATE          # Date picker
- inputType: DATE_TIME     # Date and time picker

# Boolean
- inputType: BOOLEAN       # Yes/No

# Selection
- inputType: DROPDOWN      # Single selection
- inputType: MULTISELECT   # Multiple selections
- inputType: SWATCH        # Color/pattern swatches

# File
- inputType: FILE          # File upload

# Reference
- inputType: REFERENCE     # Link to other entities
  entityType: PRODUCT      # PRODUCT, PAGE, or PRODUCT_VARIANT
```

## Error Handling Patterns

### Common Issues and Solutions

1. **Missing Dependencies**
```yaml
# ERROR: Product type "Electronics" not found
products:
  - productTypeName: "Electronics"  # Must create this first

# SOLUTION: Define product type before products
productTypes:
  - name: "Electronics"
    attributes: []
```

2. **Invalid References**
```yaml
# ERROR: Channel "us-store" not found
products:
  - channelListings:
      - channelSlug: "us-store"  # Typo or doesn't exist

# SOLUTION: Use exact slug from channels section
channels:
  - slug: "us"  # Use this exact value
```

3. **Type Mismatches**
```yaml
# ERROR: Invalid attribute value type
attributes:
  - name: "Price"
    inputType: NUMERIC
    value: "Twenty"  # Should be number

# SOLUTION: Match value type to inputType
value: 20
```

## Best Practices for AI/LLM Usage

### 1. Always Validate Context
- Check which entities already exist
- Verify referenced names/slugs
- Understand the current state

### 2. Follow Dependency Order
- Create channels first
- Then product types and categories
- Finally products and variants

### 3. Use Descriptive Names
- Names should be human-readable
- Slugs should be URL-friendly
- SKUs should follow a pattern

### 4. Handle Multi-Environment
```yaml
# Development
channels:
  - name: "Dev Channel"
    slug: "dev"
    
# Production
channels:
  - name: "Main Store"
    slug: "main"
```

## Advanced Patterns

### Dynamic Attribute Assignment

```yaml
# Product with dynamic attributes based on type
products:
  - name: "Laptop"
    productTypeName: "Electronics"
    attributes:
      - name: "RAM"
        value: "16GB"
      - name: "Storage"
        value: "512GB SSD"
```

### Hierarchical Categories

```yaml
categories:
  - name: "Electronics"
    subcategories:
      - name: "Computers"
        subcategories:
          - name: "Laptops"
          - name: "Desktops"
      - name: "Mobile"
        subcategories:
          - name: "Smartphones"
          - name: "Tablets"
```

### Multi-Warehouse Stock

```yaml
variants:
  - sku: "PROD-001"
    stocks:
      - warehouseSlug: "us-east"
        quantity: 50
      - warehouseSlug: "us-west"
        quantity: 30
      - warehouseSlug: "eu-central"
        quantity: 100
```

## Troubleshooting Guide

### Debug Information
- Enable debug logging: `LOG_LEVEL=debug`
- Check GraphQL responses
- Validate YAML syntax
- Verify API permissions

### Common GraphQL Errors
- `GRAPHQL_VALIDATION_FAILED`: Schema mismatch
- `PERMISSION_DENIED`: Insufficient API token permissions
- `NOT_FOUND`: Referenced entity doesn't exist
- `UNIQUE_CONSTRAINT`: Duplicate slug or SKU

## Integration Points

### Environment Variables
```bash
SALEOR_API_URL=https://your-store.saleor.cloud/graphql/
SALEOR_API_TOKEN=your-api-token
LOG_LEVEL=info
CONFIG_PATH=./saleor-config.yaml
```

### CLI Commands
```bash
# Apply configuration
saleor-config push --config ./config.yaml

# Retrieve current state
saleor-config pull --output ./current.yaml

# Validate without applying
saleor-config validate --config ./config.yaml
```

## Tips for AI Assistants

1. **Always check existing entities** before creating new ones
2. **Use exact name matching** - it's case-sensitive
3. **Follow the dependency graph** - some entities must exist first
4. **Validate incrementally** - test small changes
5. **Use meaningful slugs** - they're often used as identifiers
6. **Consider multi-channel** - most entities can be channel-specific
7. **Handle variants properly** - they inherit from product
8. **Remember idempotency** - operations should be safe to repeat

## Quick Reference

### Entity Creation Order
1. Shop settings
2. Channels
3. Attributes
4. Product types & Page types
5. Categories
6. Warehouses
7. Tax classes
8. Shipping zones
9. Collections
10. Products
11. Menus
12. Pages

### Naming Conventions
- **Names**: Human-readable, can contain spaces
- **Slugs**: URL-safe, lowercase, hyphens
- **SKUs**: Unique product identifiers
- **Codes**: Usually uppercase (country, currency)

This index is designed to help AI/LLM assistants understand and work with the Saleor Configurator effectively. For detailed implementation, refer to the source code and tests. 