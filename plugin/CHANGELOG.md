# Changelog - Saleor Configurator Plugin

## [2.1.0] - 2026-02-04

### Commands

| Command | Description |
|---------|-------------|
| `/configurator` | Core operations - init, validate, edit, review your config.yml |
| `/configurator-fix` | Debug & auto-fix common config issues with plain language explanations |
| `/recipe` | Quick start with pre-built store recipes (fashion, electronics, food, etc.) |
| `/discover` | Generate config from existing website or Saleor instance |
| `/configurator-model` | Interactive product modeling wizard for ProductTypes and attributes |
| `/configurator-import` | Import products from CSV, Excel, or Shopify exports |

### Agents

| Agent | Purpose |
|-------|---------|
| **config-review** | Analyzes config.yml for issues with confidence scoring |
| **troubleshoot** | Diagnoses deployment failures and suggests fixes |
| **store-analyzer** | Analyzes existing stores to suggest configurations |
| **csv-importer** | Imports generic tabular data with interactive mapping |
| **shopify-importer** | Specialized Shopify export import with variant grouping |

### Skills

| Skill | Purpose |
|-------|---------|
| **configurator-cli** | CLI commands, deploy, introspect, diff |
| **configurator-schema** | config.yml structure, entity schemas |
| **saleor-domain** | Saleor entities, relationships, GraphQL |
| **configurator-recipes** | Store templates, pre-built configs |
| **data-importer** | Import workflows, field mapping, CSV/Excel handling |
| **product-modeling** | Product vs variant attributes, attribute types, industry patterns |

### Highlights

- **Streamlined commands**: 6 focused commands covering all workflows
- **Intelligent debugging**: `/configurator-fix` auto-fixes common issues with plain language explanations
- **Pre-built recipes**: Quick start with fashion, electronics, food, subscription templates
- **Website discovery**: Generate config by exploring existing websites via chrome-devtools
- **Product modeling wizard**: Interactive guide for designing ProductTypes and attributes
- **Data import**: Import from CSV, Excel, or Shopify exports with smart field mapping
- **Proactive agents**: Automatic review after config generation, auto-troubleshoot on failures
