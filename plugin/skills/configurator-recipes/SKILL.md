---
name: configurator-recipes
version: 2.0.0
description: "Pre-built store configuration templates for common business types. Use when asking about store templates, example configs, fashion/electronics/subscription setup, or starting points."
allowed-tools: Read, Write
---

# Configurator Recipes

## Overview

Recipes are ready-to-use `config.yml` templates for common store types. Pick one that matches your business, customize it, and deploy. They save you from building your store configuration from scratch.

## When to Use

- "How do I set up a fashion store?"
- "Is there a template for electronics?"
- "Can I see an example config.yml?"
- "What's a good starting point for my store?"
- "How do I set up a subscription service?"
- When NOT looking for CLI commands -- use `configurator-cli` instead
- When NOT designing custom product types -- use `product-modeling` instead

## Available Recipes

| Recipe | Best For | Key Features |
|--------|----------|--------------|
| **Fashion Store** | Apparel, shoes, accessories | Size/color variants, seasonal collections, multi-currency |
| **Electronics Store** | Tech products, gadgets | Specs attributes, storage/RAM variants, warranty info |
| **Subscription Service** | Recurring products, SaaS | Plan tiers, billing cycles, add-on services |

For a blank starting point (correct structure, no business content), use `/configurator init`.

## Quick Start

```bash
# Option 1: Interactive wizard
/recipe

# Option 2: Copy a template directly
cp plugin/skills/configurator-recipes/templates/fashion-store.yml config.yml

# Option 3: Customize and deploy
npx configurator deploy --url=$URL --token=$TOKEN
```

## Recipe Details: Fashion Store

A complete configuration for apparel and fashion retail with two channels (US/EU), five product types, a full category tree, and curated collections.

**Channels**: US Store (USD), EU Store (EUR)

**Product Types**: T-Shirt, Pants, Dress, Shoes, Accessory -- each with appropriate size/color/material variants.

**Categories**:
```
Clothing → Men's (T-Shirts, Pants, Shoes) / Women's (Dresses, Tops, Shoes) / Accessories (Bags, Jewelry)
```

**Collections**: New Arrivals, Best Sellers, Sale Items, Seasonal Collection

**Attributes**: Size (XS-XXL), Color (swatches), Material, Brand, Care Instructions

See [templates/fashion-store.yml](templates/fashion-store.yml) for the complete configuration.

## Other Recipes

**Electronics Store** -- Single channel (USD), product types for Smartphones, Laptops, Tablets, Accessories, and Software. Attributes include Brand, Storage, RAM, Screen Size, and Warranty. See [templates/electronics-store.yml](templates/electronics-store.yml).

**Subscription Service** -- Subscription portal channel, product types for Monthly/Annual subscriptions, One-Time Purchases, and Add-Ons. Attributes include Plan Tier, Billing Cycle, User Limit, and Storage Limit. See [templates/subscription-service.yml](templates/subscription-service.yml).

## Customization Tips

After copying a recipe:

1. **Rename channels** to match your brand and regions
2. **Adjust currency and country codes** for your markets
3. **Modify categories** for your actual product catalog
4. **Add or remove product types** you don't need
5. **Test on staging first** before deploying to production

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using a recipe without customizing identifiers | Update all slugs and names to match your brand before deploying |
| Not adjusting currency/country codes | Change `currencyCode` and `defaultCountry` to your actual markets |
| Deploying a recipe straight to production | Always test on a staging instance first |
| Keeping entity types you don't need | Remove unused product types, categories, etc. to keep your config clean |
| Forgetting to update channel references | Products reference channels by slug -- make sure they match after renaming |

## Creating Your Own Recipe

1. Start with a working `config.yml`
2. Generalize names and values
3. Add YAML comments explaining each section
4. Test deployment to a fresh Saleor instance
5. Document what users should customize

## See Also

### Related Skills

- **`configurator-schema`** - Config.yml structure and validation rules
- **`product-modeling`** - Product type design and attribute selection
- **`saleor-domain`** - Entity relationships and Saleor concepts
