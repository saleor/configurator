# Configuration Schema Patterns

Reference for YAML configuration structure and common patterns.

## Complete Configuration Structure

```yaml
# config.yml - Top-level structure
shop:
  # Global store settings

channels:
  # List of sales channels

taxClasses:
  # List of tax classifications

productTypes:
  # List of product type definitions

pageTypes:
  # List of page type definitions

attributes:
  # List of attribute definitions

categories:
  # List of category definitions (hierarchical)

collections:
  # List of collection definitions

warehouses:
  # List of warehouse definitions

shippingZones:
  # List of shipping zone definitions

products:
  # List of product definitions

menus:
  # List of menu definitions (hierarchical)

models:
  # List of custom model definitions
```

## Shop Settings

```yaml
shop:
  name: "My Store"
  description: "Welcome to our store"
  defaultCountry: US
  defaultCurrency: USD
  defaultWeightUnit: KG
  companyAddress:
    streetAddress1: "123 Main St"
    city: "New York"
    postalCode: "10001"
    country: US
```

## Channels

```yaml
channels:
  - name: "Default Channel"
    slug: "default-channel"
    currencyCode: USD
    defaultCountry: US
    countries:
      - US
      - CA
    isActive: true
```

## Product Types

```yaml
productTypes:
  - name: "Physical Product"
    kind: NORMAL
    isShippingRequired: true
    isDigital: false
    weight:
      unit: KG
      value: 1.0
    productAttributes:
      - "Brand"
      - "Material"
    variantAttributes:
      - "Size"
      - "Color"

  - name: "Digital Product"
    kind: NORMAL
    isShippingRequired: false
    isDigital: true
```

## Attributes

### Dropdown Attribute

```yaml
attributes:
  - name: "Color"
    slug: "color"
    type: PRODUCT_TYPE
    inputType: DROPDOWN
    values:
      - name: "Red"
        slug: "red"
      - name: "Blue"
        slug: "blue"
      - name: "Green"
        slug: "green"
```

### Multiselect Attribute

```yaml
attributes:
  - name: "Features"
    slug: "features"
    type: PRODUCT_TYPE
    inputType: MULTISELECT
    values:
      - name: "Waterproof"
        slug: "waterproof"
      - name: "Wireless"
        slug: "wireless"
```

### Reference Attribute

```yaml
attributes:
  - name: "Related Products"
    slug: "related-products"
    type: PRODUCT_TYPE
    inputType: REFERENCE
    entityType: PRODUCT  # Required for REFERENCE type
```

### Other Input Types

```yaml
attributes:
  - name: "Description"
    inputType: RICH_TEXT

  - name: "SKU"
    inputType: PLAIN_TEXT

  - name: "In Stock"
    inputType: BOOLEAN

  - name: "Release Date"
    inputType: DATE

  - name: "Price Modifier"
    inputType: NUMERIC

  - name: "Color Swatch"
    inputType: SWATCH

  - name: "Manual PDF"
    inputType: FILE
```

## Categories (Hierarchical)

```yaml
categories:
  # Root category
  - name: "Electronics"
    slug: "electronics"
    description: "Electronic devices and accessories"

  # Child category (references parent by slug)
  - name: "Smartphones"
    slug: "smartphones"
    parent: "electronics"

  # Nested child
  - name: "iPhone"
    slug: "iphone"
    parent: "smartphones"
```

## Collections

```yaml
collections:
  - name: "Summer Sale"
    slug: "summer-sale"
    description: "Hot deals for summer"
    backgroundImage: "https://..."

  - name: "New Arrivals"
    slug: "new-arrivals"
    description: "Latest products"
```

## Warehouses

```yaml
warehouses:
  - name: "US East Warehouse"
    slug: "us-east-warehouse"
    address:
      streetAddress1: "100 Warehouse Rd"
      city: "Newark"
      postalCode: "07102"
      country: US
    shippingZones:
      - "North America"
```

## Shipping Zones

```yaml
shippingZones:
  - name: "North America"
    countries:
      - US
      - CA
      - MX
    shippingMethods:
      - name: "Standard Shipping"
        type: PRICE
        minimumOrderPrice: 0
        maximumOrderPrice: null
        price: 9.99
      - name: "Express Shipping"
        type: PRICE
        price: 24.99
```

## Products

```yaml
products:
  - name: "iPhone 15 Pro"
    slug: "iphone-15-pro"
    productType: "Physical Product"  # References by name
    category: "iphone"               # References by slug
    description: "The latest iPhone..."
    attributes:
      Brand: "Apple"
      Material: "Titanium"
    variants:
      - name: "iPhone 15 Pro - 128GB Black"
        sku: "IPHONE15PRO-128-BLK"
        attributes:
          Size: "128GB"
          Color: "Black"
        pricing:
          - channel: "default-channel"
            price: 999.00
            costPrice: 700.00
        stocks:
          - warehouse: "us-east-warehouse"
            quantity: 100
```

## Menus (Hierarchical)

```yaml
menus:
  - name: "Main Navigation"
    slug: "main-navigation"
    items:
      - name: "Shop"
        category: "electronics"  # Links to category
        children:
          - name: "Smartphones"
            category: "smartphones"
          - name: "Accessories"
            collection: "accessories"  # Links to collection

      - name: "Sale"
        collection: "summer-sale"

      - name: "About Us"
        url: "/about"  # External URL
```

## Tax Classes

```yaml
taxClasses:
  - name: "Standard Rate"
    # Country-specific rates configured in Saleor admin

  - name: "Reduced Rate"

  - name: "Zero Rate"
```

## Common Patterns

### Optional Fields

```yaml
products:
  - name: "Simple Product"
    slug: "simple-product"
    productType: "Physical Product"
    # description is optional
    # attributes are optional if type has none
```

### Empty Collections

```yaml
# Valid: Define structure with no items
categories: []
products: []
```

### Selective Configuration

```yaml
# Only configure what you need
shop:
  name: "My Store"

productTypes:
  - name: "Physical Product"
    kind: NORMAL

# Other sections omitted = no changes
```

## Validation Rules

1. **Slugs**: Must be unique within entity type
2. **Names**: Must be unique for name-based entities
3. **References**: Must point to existing entities
4. **Required Fields**: Vary by entity (see Zod schemas)
5. **Enum Values**: Must match Saleor's accepted values
