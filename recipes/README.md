# Recipes and example stores

## Bundled recipes

The `recipe` command ships four small configurations that each set up one part of a store:

| Recipe | Creates |
|---|---|
| `multi-region` | 3 channels (US, EU, UK), 3 warehouses, 3 shipping zones |
| `digital-products` | 3 product types without shipping |
| `click-and-collect` | 2 warehouses set up as pickup points, 1 shipping zone |
| `custom-shipping` | 3 shipping zones with methods and rates |

```bash
npx @saleor/configurator recipe list
npx @saleor/configurator recipe show multi-region
npx @saleor/configurator recipe apply multi-region --plan
npx @saleor/configurator recipe apply multi-region
```

To change a recipe before applying it, export it, edit the file, and apply the file:

```bash
npx @saleor/configurator recipe export multi-region --output my-store.yml
npx @saleor/configurator recipe apply my-store.yml
```

Recipes live in `src/recipes`. To add one, add its YAML file there and regenerate `manifest.json` with `pnpm exec tsx scripts/generate-recipe-manifest.ts`.

## Example stores

The folders in this directory hold larger example configurations for a whole store type. They are not available through `recipe`; copy one and deploy it with `--config`:

```bash
npx @saleor/configurator diff --config recipes/fashion/fashion.yml
npx @saleor/configurator deploy --config recipes/fashion/fashion.yml
```

| File | Store type | Contents |
|---|---|---|
| [`b2b/b2b.yml`](b2b/b2b.yml) | B2B wholesale | 2 channels, 2 product types, 2 page types, 5 categories |
| [`click-collect/click-collect.yml`](click-collect/click-collect.yml) | Buy online, pick up in store | 3 channels, 2 product types, 2 page types, 5 categories |
| [`custom-shipping/custom-shipping.yml`](custom-shipping/custom-shipping.yml) | Shipping-heavy catalog | 3 channels, 2 product types, 3 page types, 5 categories |
| [`digital-products/digital.yml`](digital-products/digital.yml) | Software, ebooks, courses | 1 channel, 5 product types, 2 page types, 5 categories |
| [`fashion/fashion.yml`](fashion/fashion.yml) | Clothing, footwear, accessories | 2 channels, 3 product types, 2 page types, 5 categories |
| [`marketplace/marketplace.yml`](marketplace/marketplace.yml) | Multi-vendor marketplace | 1 channel, 2 product types, 2 page types, 5 categories |
| [`multi-region/multi-region.yml`](multi-region/multi-region.yml) | International store | 5 channels, 1 product type, 3 page types, 4 categories |

Each file also defines shop settings and the product and content attributes its types use. CI checks that every file passes validation with no unknown keys.
