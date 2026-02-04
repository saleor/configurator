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
| `/configurator` | **Core operations** - init, validate, edit, review your config.yml |
| `/configurator-fix` | **Debug & auto-fix** - find and fix common config issues with plain language explanations |
| `/recipe` | **Quick start** - apply pre-built store recipes (fashion, electronics, food, etc.) |
| `/discover` | **Website → config** - explore existing website with chrome-devtools to generate config |
| `/configurator-model` | **Product modeling wizard** - design ProductTypes and attributes interactively |
| `/configurator-import` | **Data import** - import products from CSV, Excel, or Shopify exports |

### Getting Started Workflows

**Starting from scratch?**
```bash
/recipe fashion    # Apply pre-built fashion store recipe
/recipe electronics  # Or electronics, food, subscription, etc.
```

**Have an existing website?**
```bash
/discover          # Explore website with chrome-devtools → generate config
```

**Need to configure from Saleor instance?**
```bash
/discover --introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

**Working with existing config.yml?**
```bash
/configurator-fix        # Debug & auto-fix issues
/configurator validate   # Check for issues
/configurator edit       # Make changes
/configurator review     # Comprehensive review
```

### Domain Modeling

New to Saleor domain modeling? Use `/configurator-model` or ask questions like:

- "How do I model my products?"
- "What should be a product vs variant attribute?"
- "When to use DROPDOWN vs MULTISELECT?"

The **product-modeling** skill provides comprehensive guidance for:
- Product vs variant attribute classification
- Attribute type selection (12 types)
- Variant matrix calculations (SKU explosion prevention)
- Categories vs Collections decision tree
- 10+ industry-specific patterns

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

## Quick Start

### 1. Choose Your Workflow

**Option A: Quick Start with Recipe**
```bash
/recipe fashion    # Apply pre-built recipe and customize
```

**Option B: Generate from Website**
```bash
/discover https://yoursite.com    # Explore and generate config
```

**Option C: Start from Scratch**
```bash
/configurator init    # Create empty config.yml
```

### 2. Customize Your Configuration

```bash
/configurator edit    # Interactive menu for changes

# Or use natural language:
"Add a new product type for gift cards"
```

### 3. Validate & Review

```bash
/configurator validate    # Check for issues
/configurator review      # Comprehensive review with agent
```

### 4. Deploy to Saleor

```bash
# Preview changes first
npx configurator diff --url=$SALEOR_API_URL --token=$SALEOR_TOKEN

# Deploy
npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

## Best Practices

The plugin provides intelligent guidance throughout your workflow:

**Automatic Validation**:
- YAML syntax checking
- Schema compliance validation
- Reference integrity checks
- Best practice suggestions

**Agent Assistance**:
- Proactive review after config generation
- Automatic troubleshooting on deployment failures
- Smart attribute classification during discovery
- Dependency warnings during edits

**Safety Features**:
- Dry-run preview before deployment
- Deletion warnings
- Backup suggestions for destructive operations
- Configuration validation gates

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
