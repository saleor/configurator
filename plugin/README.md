# Saleor Configurator Claude Plugin

AI-powered Saleor e-commerce configuration through natural language conversations.

## Overview

This Claude Code plugin enables developers to configure Saleor e-commerce stores using natural language instead of manually editing YAML files. It provides:

- **Guided setup wizards** for creating store configurations from scratch
- **Interactive editing** for modifying existing configurations
- **Validation and best practices** checking before deployment
- **Deployment safety** with deletion warnings and error diagnosis
- **Pre-built recipes** for common store types (fashion, electronics, subscriptions)

## Installation

### From Claude Marketplace (Recommended)

```bash
# In Claude Code
/plugin marketplace add saleor/configurator-claude-plugin
```

### Manual Installation

```bash
# Clone or download the plugin
git clone https://github.com/saleor/configurator-claude-plugin.git

# Run Claude Code with the plugin directory
claude --plugin-dir ./configurator-claude-plugin/plugin
```

## Prerequisites

- **Claude Code** installed (`npm install -g @anthropic-ai/claude-code`)
- **Node.js 20+** (for MCP servers)
- **Saleor instance** with API token (for deployment operations)

## Configuration

### Environment Variables

Set these in your shell or create a `.env` file:

```bash
# Required for deployment operations
export SALEOR_API_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-api-token"
```

### MCP Servers

The plugin bundles two MCP servers:

| Server | Purpose | Required |
|--------|---------|----------|
| **Context7** | Fetches up-to-date Saleor documentation | No (graceful fallback) |
| **Saleor MCP** | Queries live store data | No (optional) |

Both servers are optional - the plugin works fully without them using embedded knowledge.

## Commands

| Command | Description |
|---------|-------------|
| `/configurator-workflow` | Complete multi-phase workflow: discovery → setup → import → review → deploy |
| `/configurator-init` | Initialize config.yml with correct structure (skeleton template) |
| `/configurator-setup` | Interactive wizard for creating new store configurations |
| `/configurator-model` | **Product modeling wizard** - design ProductTypes and attributes interactively |
| `/configurator-edit` | Menu-driven modification of existing configurations |
| `/configurator-validate` | Schema validation + best practices + common mistakes check |
| `/configurator-review` | Launch comprehensive configuration review agent |
| `/configurator-import` | Import products from CSV, Excel, or Shopify exports |

### Domain Modeling

New to Saleor domain modeling? Use `/configurator-model` or ask questions like:

- "How do I model my products?"
- "What should be a product vs variant attribute?"
- "When to use DROPDOWN vs MULTISELECT?"
- "When to use Models vs Attributes?"
- "How do I create custom entities like Brands?"
- "Categories vs Collections - which should I use?"
- "How do I build navigation Structures?"

The **product-modeling** skill provides comprehensive guidance for:

| Entity Type | Use For |
|-------------|---------|
| **ProductTypes + Attributes** | Product structure, variants, SKUs |
| **Models (Pages)** | Custom entities: Brands, Scent Profiles, Ingredients |
| **Categories** | Hierarchical product taxonomy (1 product = 1 category) |
| **Collections** | Curated groups, promotions (1 product = N collections) |
| **Structures (Menus)** | Navigation linking Categories, Collections, Models |

**Key decision frameworks:**
- Product vs variant attribute classification
- Attribute type selection (12 types)
- Variant matrix calculations (SKU explosion prevention)
- When to use Models vs simple Attributes
- Categories vs Collections decision tree
- 10+ industry-specific patterns

### Recommended Workflow

For new users, start with `/configurator-workflow` which guides you through:

1. **Discovery** - Analyze existing Saleor store or start fresh
2. **Setup** - Create or import configuration
3. **Import** - (Optional) Import product data from external sources
4. **Review** - Validate configuration with confidence-scored findings
5. **Deploy** - Safely deploy with dry-run preview
6. **Verify** - Confirm deployment success

Use individual commands when you need specific functionality.

## Skills

Skills provide embedded knowledge that Claude uses automatically:

| Skill | Triggers On |
|-------|-------------|
| **configurator-cli** | CLI commands, deploy, introspect, diff |
| **configurator-schema** | config.yml structure, entity schemas |
| **saleor-domain** | Saleor entities, relationships, GraphQL |
| **configurator-recipes** | Store templates, pre-built configs |
| **data-importer** | Import workflows, field mapping, CSV/Excel handling |
| **product-modeling** | "how do I model?", product vs variant attributes, attribute types |

## Agents

| Agent | Purpose | Color |
|-------|---------|-------|
| **config-review** | Analyzes config.yml for issues with confidence scoring | Blue |
| **troubleshoot** | Diagnoses deployment failures and suggests fixes | Red |
| **discover** | Analyzes existing stores to suggest configurations | Yellow |
| **csv-importer** | Imports generic tabular data with interactive mapping | Cyan |
| **shopify-importer** | Specialized Shopify export import with variant grouping | Green |

## When to Use Each Agent

| Scenario | Primary Agent | Also Consider |
|----------|---------------|---------------|
| Before first deployment | **config-review** | discover (if has existing store) |
| Deployment failed | **troubleshoot** | - |
| Import from CSV/Excel | **csv-importer** | - |
| Import from Shopify | **shopify-importer** | - |
| Analyze existing Saleor store | **discover** | - |
| After /configurator-setup | **config-review** | (proactive) |
| After /configurator-import | **config-review** | (proactive) |

### Proactive Agent Invocation

Some agents are designed to be invoked automatically:

- **config-review**: Automatically runs after `/configurator-setup`, `/configurator-edit`, or `/configurator-import` complete
- **troubleshoot**: Automatically runs when any CLI command fails
- **discover**: Suggested before setup when user mentions existing store data

## Schema Validation

The plugin includes a JSON Schema for config.yml validation:

- **Location**: `schemas/config.schema.json`
- **Usage**: IDE autocomplete, pre-commit validation, error messages
- **Coverage**: All entity types (channels, products, categories, etc.)

### Validate from CLI

```bash
# Validate config.yml against the schema (from plugin directory)
./scripts/validate-config.sh

# Validate a specific file
./scripts/validate-config.sh myconfig.yml --verbose
```

Requires Python with `pyyaml` and `jsonschema`:
```bash
pip install pyyaml jsonschema
```

## Getting Started

### Initialize Structure

Use `/configurator-init` to create a `config.yml` with the correct structure:

```bash
/configurator-init
```

This creates a skeleton with:
- All required sections with placeholder values
- Commented examples for optional sections
- Field documentation (`[REQUIRED]` vs `[OPTIONAL]`)

### Use Pre-built Recipes

For complete store configurations, use `/configurator-setup` and select a recipe:

| Recipe | Best For |
|--------|----------|
| Fashion Store | Apparel with sizes, colors, seasonal collections |
| Electronics Store | Tech products with specs and variants |
| Subscription Service | Recurring billing, digital products |

Recipe templates: `skills/configurator-recipes/templates/`

## Quick Start

### Create a New Store Configuration

```bash
# Start Claude Code with the plugin
claude --plugin-dir ./plugin

# In the Claude session:
/configurator-setup
```

Follow the wizard to create your `config.yml`.

### Modify Existing Configuration

```bash
# If you have an existing config.yml:
/configurator-edit

# Or use natural language:
"Add a new product type for gift cards with name, price, and message attributes"
```

### Validate Before Deployment

```bash
/configurator-validate

# Or:
"Validate my configuration and show any issues"
```

### Deploy Configuration

```bash
# Natural language:
"Deploy my configuration to Saleor"

# The CLI command:
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

## Hooks

The plugin includes safety and quality hooks:

| Hook | Event | Purpose |
|------|-------|---------|
| **Context Detection** | SessionStart | Detects config.yml, credentials, project type |
| **YAML Validation** | PreToolUse (Write/Edit) | Blocks invalid YAML syntax before saving |
| **Deploy Safety** | PreToolUse (Bash) | Requires dry-run first, warns about deletions |
| **CLI Result Analysis** | PostToolUse (Bash) | Summarizes deploy/introspect/diff results, triggers troubleshoot on failure |
| **Config Change Guidance** | PostToolUse (Write/Edit) | Suggests running diff after config changes |
| **Completion Quality Gate** | Stop | Prevents premature stopping on incomplete tasks |

### Completion Quality Gate

The Stop hook ensures Claude doesn't stop prematurely when:
- Config modification was requested but validation wasn't run
- Deployment failed but troubleshooting wasn't offered
- Data import started but wasn't completed
- Setup ran but config-review wasn't invoked

This improves task completion quality without requiring user intervention.

## Documentation

- [Configurator CLI Documentation](https://docs.saleor.io/configurator)
- [Saleor Documentation](https://docs.saleor.io)
- [Claude Code Plugin Guide](https://docs.anthropic.com/claude-code/plugins)

## Support

- **Issues**: [GitHub Issues](https://github.com/saleor/configurator-claude-plugin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/saleor/configurator-claude-plugin/discussions)
- **Saleor Community**: [Discord](https://discord.gg/saleor)

## User Settings

For project-specific configuration, copy the settings template:

```bash
cp plugin/.claude/saleor-configurator.local.md.template .claude/saleor-configurator.local.md
```

This file supports:
- Saleor credentials (kept local, gitignored)
- Default behavior settings
- Preferred channels and warehouses
- Project notes

## Plugin Validation

Validate the plugin structure:

```bash
./plugin/scripts/validate-plugin.sh
```

## License

MIT License - see [LICENSE](LICENSE) for details.
