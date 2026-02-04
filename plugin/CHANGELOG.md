# Changelog - Saleor Configurator Plugin

## [2.0.0] - 2026-02-04

### Breaking Changes
- Removed all hooks (they were buggy and causing issues)
- Consolidated 8 commands into 5 focused commands for better DX

### Commands - Removed
- `/configurator-workflow` - Functionality distributed across new commands
- `/configurator-init` - Now `/configurator init`
- `/configurator-setup` - Now `/recipe`
- `/configurator-validate` - Now `/configurator validate`
- `/configurator-edit` - Now `/configurator edit`
- `/configurator-review` - Now `/configurator review`

### Commands - New/Updated
- `/configurator` - Core operations (init, validate, edit, review)
  - Unified interface for essential config operations
  - Supports subcommands or interactive menu
  
- `/recipe` - Quick start with pre-built store recipes
  - Apply fashion, electronics, food, subscription, or general recipes
  - Smart defaults with optional customization
  - Direct deployment support
  
- `/discover` - Generate config from existing website/store
  - Website exploration via chrome-devtools MCP
  - Saleor introspection mode
  - Manual input fallback
  - Intelligent business type detection

### Commands - Kept
- `/configurator-model` - Product modeling wizard (unchanged)
- `/configurator-import` - Data import from CSV/Excel/Shopify (unchanged)

### Hooks - Removed
- SessionStart context detection hook
- PreToolUse YAML validation hook
- PreToolUse deployment safety hook
- PostToolUse CLI result analysis hook
- PostToolUse config change guidance hook
- Stop completion quality gate hook

Rationale: Hooks were causing issues and their functionality can be better achieved through agent-based guidance and explicit validation commands.

### Improved
- Simplified command structure (8 → 5 commands)
- Better DX with focused workflows
- Enhanced README with clear getting-started paths
- Updated plugin description for v2.0.0

### Migration Guide

**Old Command → New Command**
- `/configurator-init` → `/configurator init`
- `/configurator-validate` → `/configurator validate`
- `/configurator-edit` → `/configurator edit`
- `/configurator-review` → `/configurator review`
- `/configurator-setup` → `/recipe`
- `/configurator-workflow` → Use `/recipe` or `/discover` based on need

**Workflow Changes**
- Recipe workflow: Use `/recipe [type]` instead of `/configurator-setup`
- Discovery workflow: Use `/discover` instead of `/configurator-workflow discover`
- Core operations: Use `/configurator [operation]` for init/validate/edit/review

## [2.1.0] - 2026-02-04

### Added
- `/configurator-fix` - Intelligent debugging and auto-fixing command
  - Plain language error explanations with line numbers
  - Auto-fix common issues (invalid slugs, typos, YAML syntax)
  - Before/after examples for all fixes
  - Manual fix guidance with step-by-step instructions
  - Interactive or automatic mode

### Features
**Auto-fixable issues:**
- Invalid slugs (spaces, uppercase, underscores)
- Entity reference typos (fuzzy matching)
- YAML syntax errors (quotes, indentation)
- Invalid ISO codes (currency/country)
- Duplicate identifiers (auto-rename)
- Logical inconsistencies (digital + shipping)

**Manual fix guidance:**
- Missing SKUs (requires unique identifier)
- Missing referenced entities
- Empty required fields

### Improved
- Better debugging workflow: `/configurator-fix` → `/configurator validate` → deploy
- Reduced time to fix configuration issues
- User-friendly error messages

