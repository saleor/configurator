# Introducing Configurator: Commerce as Code for Saleor

Modern commerce requires flexible, repeatable setups. Yet most teams still configure their Saleor instances manually through the dashboard. We built Configurator to change that.

Configurator brings declarative configuration to Saleor. Define your commerce structure in YAML, version it with Git, and apply it consistently across all your environments.

## What Configurator Does

Configurator is a CLI tool that syncs YAML configuration files with your Saleor instance through the GraphQL API. It manages your complete commerce structure: channels, product types, categories, attributes, tax settings, shipping methods, warehouses and shop settings.

Think of it as infrastructure as code, but for your commerce configuration.

## Getting Started in Minutes

Install Configurator and connect to your existing Saleor instance:

```bash
npm install -g @saleor/configurator
configurator start
```

The interactive setup walks you through connecting to your Saleor instance and choosing what to manage.

## Introspect: Your Current Setup as Code

The most powerful feature? Introspect your existing configuration into code:

```bash
configurator introspect --url https://demo.saleor.cloud --token your-token
```

This generates a complete `config.yml` file representing your current Saleor setup:

```yaml
shop:
  name: "Demo Store"
  description: "Fashion & Lifestyle"

channels:
  - name: "United States"
    slug: "default-channel"
    currencyCode: "USD"
    defaultCountry: "US"
    countries: ["US", "CA"]

productTypes:
  - name: "T-Shirt"
    slug: "t-shirt"
    hasVariants: true
    productAttributes:
      - name: "Material"
        slug: "material"
        type: "DROPDOWN"
        values:
          - name: "Cotton"
            slug: "cotton"
          - name: "Polyester"
            slug: "polyester"
    variantAttributes:
      - name: "Size"
        slug: "size"
        type: "DROPDOWN"
        values:
          - name: "Small"
            slug: "s"
          - name: "Medium"
            slug: "m"
          - name: "Large"
            slug: "l"
```

Now your entire commerce structure lives in version control.

## Making Changes: See What Happens Before It Happens

Want to add a new product type? Edit your `config.yml`:

```yaml
productTypes:
  # ... existing types ...
  
  - name: "Hoodie"
    slug: "hoodie"
    hasVariants: true
    isShippingRequired: true
    productAttributes:
      - name: "Material"  # Reuses existing attribute
      - name: "Hood Style"
        slug: "hood-style"
        type: "DROPDOWN"
        values:
          - name: "Pullover"
            slug: "pullover"
          - name: "Zip-up"
            slug: "zip-up"
    variantAttributes:
      - name: "Size"  # Reuses existing attribute
      - name: "Color"
        slug: "color"
        type: "SWATCH"
        values:
          - name: "Black"
            value: "#000000"
          - name: "Gray"
            value: "#808080"
```

Before applying changes, see exactly what will happen:

```bash
configurator diff

# Output:
Comparing local config with https://demo.saleor.cloud

ProductTypes:
  + hoodie (Hoodie)
    
Attributes:
  + hood-style (Hood Style)
  + color (Color)

Summary: 1 product type and 2 attributes will be created
```

Apply when ready:

```bash
configurator deploy

Creating product type "Hoodie"...
Creating attribute "Hood Style"...
Creating attribute "Color"...
Linking attributes to product type...

✓ Configuration synchronized successfully
```

## Real Example: Setting Up a Multi-Channel Store

Here's how you'd configure a multi-region setup from scratch:

```yaml
shop:
  name: "Global Fashion Store"
  description: "Premium fashion across continents"

channels:
  - name: "Europe"
    slug: "eu"
    currencyCode: "EUR"
    countries: ["DE", "FR", "IT", "ES", "NL"]
    defaultCountry: "DE"
    stockSettings:
      allocationStrategy: "PRIORITIZE_HIGH_STOCK"
      
  - name: "United States"
    slug: "us"
    currencyCode: "USD"
    countries: ["US"]
    defaultCountry: "US"
    stockSettings:
      allocationStrategy: "PRIORITIZE_SORTING_ORDER"

categories:
  - name: "Clothing"
    slug: "clothing"
    description: "All clothing items"
    children:
      - name: "Men"
        slug: "men"
        children:
          - name: "Shirts"
            slug: "men-shirts"
          - name: "Pants"
            slug: "men-pants"
      - name: "Women"
        slug: "women"
        children:
          - name: "Dresses"
            slug: "women-dresses"
          - name: "Tops"
            slug: "women-tops"

productTypes:
  - name: "Apparel"
    slug: "apparel"
    hasVariants: true
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        slug: "brand"
        type: "DROPDOWN"
        inputType: "DROPDOWN"
        entityType: "PRODUCT"
        values:
          - name: "Nike"
            slug: "nike"
          - name: "Adidas"
            slug: "adidas"
          - name: "Puma"
            slug: "puma"
      - name: "Material"
        slug: "material"
        type: "MULTISELECT"
        inputType: "MULTISELECT"
        entityType: "PRODUCT"
        values:
          - name: "Cotton"
            slug: "cotton"
          - name: "Wool"
            slug: "wool"
          - name: "Synthetic"
            slug: "synthetic"
    variantAttributes:
      - name: "Size"
        slug: "size"
        type: "DROPDOWN"
        inputType: "DROPDOWN"
        entityType: "PRODUCT_VARIANT"
        values:
          - name: "XS"
            slug: "xs"
          - name: "S"
            slug: "s"
          - name: "M"
            slug: "m"
          - name: "L"
            slug: "l"
          - name: "XL"
            slug: "xl"
      - name: "Color"
        slug: "color"
        type: "SWATCH"
        inputType: "SWATCH"
        entityType: "PRODUCT_VARIANT"
        values:
          - name: "Red"
            slug: "red"
            value: "#FF0000"
          - name: "Blue"
            slug: "blue"
            value: "#0000FF"
          - name: "Green"
            slug: "green"
            value: "#00FF00"
```

Running `configurator deploy` creates this entire structure in minutes. No clicking through forms. No missing attributes. No inconsistencies between environments.

## Working with Existing Stores

Configurator respects your existing data. When you introspect and then deploy:

1. **Existing entities are updated**, not recreated
2. **References are preserved** - if an attribute already exists, it's reused
3. **Nothing is deleted** unless you explicitly use `--force`

This means you can safely use Configurator on production stores:

```bash
# Introspect current production config
configurator introspect --url prod.saleor.cloud > prod-config.yml

# Apply to staging for testing
configurator deploy --url staging.saleor.cloud --config prod-config.yml

# Make changes and test
vim prod-config.yml
configurator diff --url staging.saleor.cloud
configurator deploy --url staging.saleor.cloud

# When ready, apply to production
configurator deploy --url prod.saleor.cloud
```

## Smart Validation

Configurator validates everything before making changes:

```bash
configurator deploy

Validating configuration...
✗ Error: Attribute "size" is referenced but not defined
✗ Error: Channel "eu" has duplicate country "DE"
✗ Error: Product type "shoes" has no variant attributes but hasVariants is true

Fix these issues and try again.
```

## Selective Management

Choose what Configurator manages:

```bash
# Only manage product types and attributes
configurator deploy --include productTypes,attributes

# Everything except channels
configurator deploy --exclude channels

# Dry run to see what would change
configurator deploy --dry-run
```

## Team Workflows

Configurator fits naturally into your development workflow:

**Feature branches for configuration changes:**
```bash
git checkout -b add-gift-cards
# Edit config.yml to add gift card product type
configurator diff
git add config.yml
git commit -m "Add gift card product type"
```

**Code review for commerce changes:**
Your team can review configuration changes in pull requests, just like code.

**Consistent environments:**
Every developer runs the same configuration. No more "works on my machine" for commerce setups.

## How It Works

Configurator speaks directly to Saleor's GraphQL API. Each command translates your YAML configuration into the appropriate GraphQL operations. The diff engine compares your local state with the remote instance, showing you exactly what will change before any modifications are made.

## What's Next

We're actively developing Configurator based on community feedback:

- **Recipe system** - Pre-built configurations for common use cases
- **Migration support** - Safely evolve your configuration over time
- **Extended coverage** - Tax settings, shipping methods, permissions

## Try Configurator Today

```bash
npm install -g @saleor/configurator
configurator start
```

In five minutes, you'll have your Saleor configuration in code. Version it, review it, replicate it.

**Resources:**
- [GitHub Repository](https://github.com/saleor/configurator)
- [Documentation](https://github.com/saleor/configurator#readme)
- [NPM Package](https://www.npmjs.com/package/@saleor/configurator)

## Open Source & Community

Configurator is open source and accepting contributions. Check out the [GitHub repository](https://github.com/saleor/configurator) to report issues, suggest features, or contribute code.

Have questions or want to share how you're using Configurator? Join the conversation in our [Discord community](hhttps://saleor.io/discord).

---