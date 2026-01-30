---
"@saleor/configurator": minor
---

Add Claude Code plugin for AI-powered Saleor configuration

This plugin enables developers to configure Saleor e-commerce stores using natural language
conversations with Claude. Features include:

**Commands (8 total):**
- `/configurator-workflow` - Complete multi-phase workflow
- `/configurator-setup` - Interactive store configuration wizard
- `/configurator-model` - Product modeling wizard with decision frameworks
- `/configurator-edit` - Menu-driven configuration editing
- `/configurator-validate` - Schema validation and best practices check
- `/configurator-review` - Launch config review agent
- `/configurator-import` - Import from CSV, Excel, or Shopify
- `/configurator-init` - Initialize config.yml skeleton

**Agents (5 total):**
- `config-review` - Analyzes config.yml with confidence scoring
- `troubleshoot` - Diagnoses deployment failures
- `discover` - Analyzes existing stores
- `csv-importer` - Imports tabular data with field mapping
- `shopify-importer` - Specialized Shopify export import

**Skills (6 total):**
- `product-modeling` - Complete domain modeling with decision frameworks
- `configurator-cli` - CLI commands and flags reference
- `configurator-schema` - Config.yml structure guide
- `configurator-recipes` - Pre-built store templates
- `data-importer` - Import workflows and transformations
- `saleor-domain` - Entity relationships and GraphQL

**Hooks:**
- YAML validation before writes
- Deployment safety checks (dry-run requirement)
- CLI result analysis and error handling
- Task completion quality gate

**Additional features:**
- MCP server integration (Context7, Saleor)
- JSON Schema for config.yml validation
- User settings template for credentials
