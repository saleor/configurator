---
"@saleor/configurator": minor
---

feat: add Saleor Configurator Claude Code plugin

Introduces a complete Claude Code plugin for AI-powered Saleor e-commerce configuration:

**Skills** (5):
- `configurator-cli`: CLI commands, flags, and usage patterns
- `configurator-schema`: YAML config.yml structure and validation
- `saleor-domain`: Saleor entities, relationships, GraphQL concepts
- `configurator-recipes`: Pre-built templates (fashion, electronics, subscription)
- `data-importer`: CSV/Shopify data import patterns and transformations

**Commands** (5):
- `/configurator-setup`: Interactive guided setup wizard
- `/configurator-edit`: Focused modification for existing configs
- `/configurator-validate`: Schema validation + best practices review
- `/configurator-review`: Launch config-review agent for deep analysis
- `/configurator-import`: Import data from CSV or external sources

**Agents** (5):
- `config-review`: Analyzes config.yml for issues and anti-patterns
- `troubleshoot`: Diagnoses deployment failures with remediation steps
- `discover`: Analyzes existing Saleor instance via MCP
- `csv-importer`: Imports product data from CSV files
- `shopify-importer`: Migrates Shopify export data to Saleor format

**Hooks**:
- SessionStart: Auto-detects project context and credentials
- PreToolUse/PostToolUse: Validates config changes and deployment safety

**MCP Integration**:
- Context7 MCP for dynamic Saleor documentation
- Prepared for Saleor MCP integration for live store queries

Install via: `/plugin marketplace add saleor/configurator-claude-plugin`
