# Saleor Configurator - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js >= 20
- pnpm package manager
- Access to a Saleor instance
- Saleor API token with appropriate permissions

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd saleor-configurator

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
```

### Configure Environment

Edit `.env` file:
```bash
GRAPHQL_ENDPOINT=https://your-store.saleor.cloud/graphql/
SALEOR_APP_TOKEN=your-app-token
LOG_LEVEL=info
```

### Your First Configuration

Create `my-store.yml`:

```yaml
# Basic store setup
shop:
  defaultMailSenderName: "My Store"
  defaultMailSenderAddress: "hello@mystore.com"

# Create a sales channel
channels:
  - name: "United States"
    slug: "us"
    currencyCode: "USD"
    defaultCountry: "US"

# Create a warehouse
warehouses:
  - name: "Main Warehouse"
    slug: "main"
    address:
      streetAddress1: "123 Main St"
      city: "New York"
      countryCode: "US"
      postalCode: "10001"

# Create product attributes
attributes:
  - name: "Size"
    slug: "size"
    type: "PRODUCT_TYPE"
    inputType: "DROPDOWN"
    choices:
      - { name: "Small", slug: "s" }
      - { name: "Medium", slug: "m" }
      - { name: "Large", slug: "l" }

# Create a product type
productTypes:
  - name: "T-Shirt"
    slug: "t-shirt"
    hasVariants: true
    variantAttributes: ["size"]

# Create a category
categories:
  - name: "Clothing"
    slug: "clothing"

# Create your first product
products:
  - name: "Basic T-Shirt"
    slug: "basic-tshirt"
    productType: "t-shirt"
    category: "clothing"
    channelListings:
      - channel: "us"
        isPublished: true
        basePrice:
          amount: 19.99
          currency: "USD"
    variants:
      - name: "Basic T-Shirt / Small"
        sku: "TSHIRT-S"
        attributes:
          size: "s"
```

### Apply Configuration

```bash
# Push your configuration to Saleor
pnpm run push -- --config ./my-store.yml

# Or use the default location
pnpm run push  # Uses ./saleor-config.yml
```

## 📖 Common Use Cases

### Multi-Channel Store

```yaml
channels:
  - name: "B2C United States"
    slug: "b2c-us"
    currencyCode: "USD"
    defaultCountry: "US"
  
  - name: "B2C Europe"
    slug: "b2c-eu"
    currencyCode: "EUR"
    defaultCountry: "DE"
  
  - name: "B2B Wholesale"
    slug: "b2b"
    currencyCode: "USD"
    defaultCountry: "US"
    orderSettings:
      allowUnpaidOrders: true
```

### Complex Product with Variants

```yaml
# Define color attribute
attributes:
  - name: "Color"
    slug: "color"
    type: "PRODUCT_TYPE"
    inputType: "SWATCH"
    choices:
      - { name: "Red", slug: "red", value: "#FF0000" }
      - { name: "Blue", slug: "blue", value: "#0000FF" }

# Product with size and color variants
products:
  - name: "Premium Hoodie"
    slug: "premium-hoodie"
    productType: "hoodie"  # Must exist
    variants:
      - name: "Premium Hoodie / Red / S"
        sku: "HOODIE-RED-S"
        attributes:
          color: "red"
          size: "s"
        channelListings:
          - channel: "us"
            price:
              amount: 49.99
              currency: "USD"
      - name: "Premium Hoodie / Red / M"
        sku: "HOODIE-RED-M"
        attributes:
          color: "red"
          size: "m"
        channelListings:
          - channel: "us"
            price:
              amount: 49.99
              currency: "USD"
```

### Shipping Configuration

```yaml
shippingZones:
  - name: "United States"
    countries: ["US"]
    channels: ["us"]
    shippingMethods:
      - name: "Standard Shipping"
        type: "PRICE"  # PRICE or WEIGHT based
        channelListings:
          - channel: "us"
            price:
              amount: 5.00
              currency: "USD"
            minimumOrderPrice:
              amount: 0
              currency: "USD"
      
      - name: "Express Shipping"
        type: "PRICE"
        channelListings:
          - channel: "us"
            price:
              amount: 15.00
              currency: "USD"
```

### Discounts and Promotions

```yaml
vouchers:
  - name: "Welcome Discount"
    code: "WELCOME10"
    discountType: "PERCENTAGE"
    discountValue: 10
    channelListings:
      - channel: "us"
    usageLimit: 1000
    applyOncePerCustomer: true
    
  - name: "Free Shipping"
    code: "FREESHIP"
    discountType: "SHIPPING"
    channelListings:
      - channel: "us"
    minCheckoutItemsQuantity: 3
```

## 🔧 Useful Commands

### Pull Existing Configuration

```bash
# Retrieve current configuration from Saleor
pnpm run pull

# This creates saleor-config.yml with current state
```

### Test Your Configuration

```bash
# Run tests
pnpm test

# Run specific test file
pnpm test src/modules/product/product-service.test.ts
```

### Debug Mode

```bash
# Enable detailed logging
LOG_LEVEL=debug pnpm run push
```

## 📝 Configuration Tips

### 1. Start Small
Begin with core entities and gradually add complexity:
1. Channels
2. Attributes & Types
3. Categories
4. Products
5. Additional features

### 2. Use Meaningful Identifiers
```yaml
# Good slugs
slug: "mens-clothing"      ✅
slug: "summer-2024"        ✅
slug: "cat1"               ❌
slug: "Collection 1"       ❌ (no spaces)
```

### 3. Reference Entities Correctly
```yaml
# References use slugs or names (check module docs)
products:
  - productType: "t-shirt"        # By slug
    category: "mens-clothing"     # By slug
    collections: ["summer-2024"]  # Array of slugs
```

### 4. Handle Dependencies
The configurator handles dependencies automatically, but understand the order:
- Channels → Collections, Products, Shipping, Tax
- Attributes → Product Types, Page Types
- Product Types → Products
- Categories → Products

## 🐛 Troubleshooting

### Common Issues

**"Entity not found" error**
- Check that the referenced entity exists
- Verify exact spelling of slugs/names
- Ensure proper creation order

**"Permission denied" error**
- Verify API token has necessary permissions
- Check token hasn't expired

**"Validation failed" error**
- Review required fields for the entity
- Check data types match schema
- Validate YAML syntax

### Getting Help

1. Check error messages - they're descriptive
2. Enable debug logging for more details
3. Review test files for working examples
4. Check module documentation

## 🎯 Next Steps

1. Explore [MODULES_DOCUMENTATION.md](./MODULES_DOCUMENTATION.md) for detailed information
2. Check individual module tests for examples
3. Review the configuration schema in `src/modules/config/schema.ts`
4. Set up CI/CD for automated deployments

## 💡 Pro Tips

### Use YAML Anchors for Repeated Values

```yaml
# Define anchor
defaultPrice: &default_price
  amount: 29.99
  currency: "USD"

# Use anchor
products:
  - channelListings:
      - channel: "us"
        basePrice: *default_price
```

### Environment-Specific Configs

```bash
# Development
pnpm run push -- --config ./config.dev.yml

# Staging
pnpm run push -- --config ./config.staging.yml

# Production
pnpm run push -- --config ./config.prod.yml
```

### Backup Before Major Changes

```bash
# Pull current state
pnpm run pull -- --output ./backup-$(date +%Y%m%d).yml

# Apply new changes
pnpm run push -- --config ./new-config.yml
```

Happy configuring! 🎉 