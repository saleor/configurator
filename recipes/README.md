# Saleor Configurator Recipes

Ready-to-use configuration templates for common e-commerce scenarios. Each recipe provides a complete, production-ready configuration that you can deploy immediately or customize to your needs.

## 🚀 Quick Start

```bash
# Initialize a new project with a recipe
npx @saleor/configurator init --recipe marketplace

# List all available recipes
npx @saleor/configurator recipes

# Apply a recipe to an existing configuration
npx @saleor/configurator apply --recipe fashion
```

## 📚 Available Recipes

### [Marketplace](./marketplace/)
Multi-vendor marketplace with vendor management, commission handling, and order splitting.

**Use cases:**
- Multi-vendor platforms
- B2B2C marketplaces
- Service marketplaces

**Quick start:**
```bash
npx @saleor/configurator init --recipe marketplace
```

### [Fashion & Apparel](./fashion/)
Complete fashion store setup with size charts, color swatches, and seasonal collections.

**Use cases:**
- Clothing stores
- Footwear retailers
- Accessories shops

**Quick start:**
```bash
npx @saleor/configurator init --recipe fashion
```

### [B2B Wholesale](./b2b/)
Business-to-business configuration with volume pricing, approval workflows, and custom pricing.

**Use cases:**
- Wholesale distributors
- Manufacturing suppliers
- B2B portals

**Quick start:**
```bash
npx @saleor/configurator init --recipe b2b
```

### [Digital Products](./digital-products/)
Configuration for selling non-physical goods like software, media, and services.

**Use cases:**
- Software licenses
- Digital downloads
- Online courses
- Subscription services

**Quick start:**
```bash
npx @saleor/configurator init --recipe digital-products
```

### [Multi-Region](./multi-region/)
Global commerce setup with multiple currencies, languages, and regional settings.

**Use cases:**
- International stores
- Multi-country operations
- Regional pricing strategies

**Quick start:**
```bash
npx @saleor/configurator init --recipe multi-region
```

### [Click & Collect](./click-collect/)
Omnichannel configuration with buy online pickup in-store (BOPIS) and curbside pickup.

**Use cases:**
- Retail chains
- Grocery stores
- Quick service restaurants
- Hybrid retail models

**Quick start:**
```bash
npx @saleor/configurator init --recipe click-collect
```

### [Custom Shipping](./custom-shipping/)
Advanced shipping setup with complex rules, multiple carriers, and freight options.

**Use cases:**
- Complex logistics
- Multi-carrier strategies
- Freight shipping
- Special delivery services

**Quick start:**
```bash
npx @saleor/configurator init --recipe custom-shipping
```

## 🎯 Choosing the Right Recipe

| Recipe | Best For | Key Features |
|--------|----------|--------------|
| **Marketplace** | Platform business models | Vendor management, commission tracking, split orders |
| **Fashion** | Apparel & accessories | Size/color variants, seasonal collections, care instructions |
| **B2B** | Wholesale & distribution | MOQ, volume pricing, payment terms, approval workflows |
| **Digital Products** | Software & media | No shipping, instant delivery, license management |
| **Multi-Region** | Global operations | Multi-currency, regional pricing, localized content |
| **Click & Collect** | Omnichannel retail | BOPIS, curbside pickup, store integration |
| **Custom Shipping** | Complex logistics | Multi-carrier, freight, zone-based pricing |

## 🛠️ Customization Guide

Each recipe is a starting point. Here's how to customize:

### 1. Start with a Recipe
```bash
npx @saleor/configurator init --recipe fashion
```

### 2. Review the Generated Configuration
```bash
cat config.yml
```

### 3. Customize to Your Needs
Edit `config.yml` to:
- Add custom attributes
- Modify channel settings
- Adjust product types
- Configure categories

### 4. Preview Changes
```bash
npx @saleor/configurator diff --url https://your-store.saleor.cloud/graphql/ --token your-token
```

### 5. Deploy
```bash
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📝 Recipe Structure

Each recipe includes:

```
recipe-name/
├── recipe.yml          # Main configuration file
├── README.md          # Recipe documentation
├── examples/          # Additional examples (optional)
│   └── advanced.yml   # Advanced configuration
└── screenshots/       # Visual examples (optional)
    └── demo.png       # Screenshot of the recipe in action
```

## 🤝 Contributing Recipes

We welcome community contributions! To add a new recipe:

1. Fork the repository
2. Create your recipe in `recipes/your-recipe-name/`
3. Include:
   - `recipe.yml` - The configuration file
   - `README.md` - Documentation with use cases
   - Examples (optional but recommended)
4. Test your recipe against a Saleor instance
5. Submit a pull request

### Recipe Guidelines

- **Production-ready**: Recipes should be deployable without modifications
- **Well-documented**: Include clear use cases and customization notes
- **Best practices**: Follow Saleor configuration best practices
- **Tested**: Verify the recipe works with the latest Saleor version

## 🔗 Related Resources

- [Saleor Recipes Documentation](https://docs.saleor.io/recipes)
- [Configuration Schema](../SCHEMA.md)
- [Configurator CLI Documentation](../README.md)

## 📄 License

All recipes are provided under the same license as the Saleor Configurator project.