---
name: configurator-recipes
version: 1.0.0
description: Provides pre-built Saleor configuration templates for common e-commerce store types including fashion retail, electronics, and subscription services. This skill should be invoked when the user wants to start with a template, needs a complete store setup example, or is looking for best-practice configurations. Templates include channels, product types, categories, and attributes tailored to each business model.
allowed-tools: Read, Write
---

# Configurator Recipes

Pre-built configuration templates for quickly setting up common e-commerce store types.

## Available Recipes

| Recipe | Best For | Includes |
|--------|----------|----------|
| **Fashion Store** | Apparel, shoes, accessories | Size/color variants, seasonal collections |
| **Electronics Store** | Tech products, gadgets | Specs attributes, warranty info |
| **Subscription Service** | Recurring products, SaaS | Subscription types, billing cycles |

**Note**: For a blank starting point, use `/configurator-init` which creates a skeleton with the correct structure but no business-specific content.

## Using Recipes

### Quick Start

**For structure only** (blank slate):
```bash
/configurator-init               # Creates skeleton config.yml
```

**For pre-built store** (complete recipe):
```bash
/configurator-setup              # Interactive wizard with recipe selection
```

### Manual Copy

1. Choose a recipe that matches your business
2. Copy the template to your project
3. Customize for your specific needs
4. Deploy to Saleor

### Customization Tips

- Rename channels to match your brand
- Adjust categories for your product catalog
- Modify attributes for your specific products
- Update currency and country codes

## Recipe: Fashion Store

A complete configuration for apparel and fashion retail.

### What's Included

**Channels**:
- US Store (USD)
- EU Store (EUR)

**Product Types**:
- T-Shirt (Size, Color variants)
- Pants (Waist, Length, Color variants)
- Dress (Size, Color variants)
- Shoes (Size, Color variants)
- Accessory (Color, Material variants)

**Categories**:
```
Clothing
├── Men's
│   ├── T-Shirts
│   ├── Pants
│   └── Shoes
├── Women's
│   ├── Dresses
│   ├── Tops
│   └── Shoes
└── Accessories
    ├── Bags
    └── Jewelry
```

**Collections**:
- New Arrivals
- Best Sellers
- Sale Items
- Seasonal Collection

**Attributes**:
- Size (XS, S, M, L, XL, XXL)
- Color (with swatches)
- Material
- Brand
- Care Instructions

See [templates/fashion-store.yml](templates/fashion-store.yml) for the complete configuration.

## Recipe: Electronics Store

A complete configuration for electronics and tech retail.

### What's Included

**Channels**:
- Main Store (USD)

**Product Types**:
- Smartphone (Storage, Color variants)
- Laptop (RAM, Storage, Color variants)
- Tablet (Storage, Color variants)
- Accessory (Color variants)
- Software (License type variants)

**Categories**:
```
Electronics
├── Phones
│   ├── Smartphones
│   └── Accessories
├── Computers
│   ├── Laptops
│   ├── Desktops
│   └── Accessories
├── Audio
│   ├── Headphones
│   └── Speakers
└── Software
    ├── Apps
    └── Games
```

**Attributes**:
- Brand
- Storage (64GB, 128GB, 256GB, 512GB, 1TB)
- RAM (8GB, 16GB, 32GB, 64GB)
- Screen Size
- Color
- Warranty Period

See [templates/electronics-store.yml](templates/electronics-store.yml) for the complete configuration.

## Recipe: Subscription Service

A complete configuration for subscription-based products.

### What's Included

**Channels**:
- Subscription Portal (USD)

**Product Types**:
- Monthly Subscription (Plan tier variants)
- Annual Subscription (Plan tier variants)
- One-Time Purchase (no variants)
- Add-On Service (no variants)

**Categories**:
```
Subscriptions
├── Plans
│   ├── Basic
│   ├── Professional
│   └── Enterprise
└── Add-Ons
    ├── Storage
    ├── Support
    └── Features
```

**Attributes**:
- Plan Tier (Basic, Pro, Enterprise)
- Billing Cycle (Monthly, Annual)
- Features Included
- User Limit
- Storage Limit

See [templates/subscription-service.yml](templates/subscription-service.yml) for the complete configuration.

## Applying a Recipe

### Option 1: Direct Copy

```bash
# Copy recipe to your project
cp plugin/skills/configurator-recipes/templates/fashion-store.yml config.yml

# Customize and deploy
npx configurator deploy --url=$URL --token=$TOKEN
```

### Option 2: Via Setup Wizard

Run `/configurator-setup` and select "Use template" when prompted.

### Option 3: Merge with Existing

Use the recipe as a reference and manually add components to your existing config.yml.

## Creating Custom Recipes

To create your own recipe:

1. Start with a working config.yml
2. Generalize names and values
3. Add comments explaining each section
4. Test deployment to a fresh Saleor instance
5. Document customization points

## Recipe Best Practices

1. **Start small**: Don't use all features immediately
2. **Customize incrementally**: Change one thing at a time
3. **Test often**: Deploy to staging first
4. **Document changes**: Track what you modified from the recipe
