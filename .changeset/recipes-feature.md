---
"@saleor/configurator": minor
---

Add recipes: pre-built configuration templates for common e-commerce patterns

New `configurator recipe` command with subcommands:

- `configurator recipe list [--category <category>]` - Browse available recipes
- `configurator recipe show <name>` - Preview a recipe's configuration and metadata
- `configurator recipe apply <name> --url <url> --token <token>` - Apply a recipe to your Saleor instance
- `configurator recipe export <name> [--output <path>]` - Export a recipe for local customization

Built-in recipes included:

- **multi-region** - Configure channels for US, EU, and UK markets with regional warehouses
- **digital-products** - Product types for digital goods (ebooks, software, subscriptions)
- **click-and-collect** - Warehouse pickup points with local collection shipping
- **custom-shipping** - Shipping zones with tiered rates for US, EU, and worldwide

All commands support `--json` flag for CI/CD automation and scripting.
