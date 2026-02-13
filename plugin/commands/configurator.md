---
name: configurator
description: Core Saleor configuration operations - initialize, validate, edit, and review your config.yml
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Grep, Glob, TaskCreate, TaskUpdate, TaskList
argument-hint: [init|validate|edit|review] [options]
---

# Configurator

Core command for managing your Saleor configuration. This command provides essential operations for working with config.yml.

## Usage

```bash
/configurator init       # Initialize new config.yml
/configurator validate   # Validate configuration
/configurator edit       # Edit configuration interactively
/configurator review     # Launch comprehensive review agent
/configurator           # Show menu if no argument
```

## Operation: init

Initialize a new config.yml with the correct structure.

### Process

1. **Check for existing config**:
```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

2. **If exists**, ask user:
   - Backup and replace (creates config.yml.backup)
   - Cancel initialization

3. **Copy skeleton template**:
```bash
cp ${CLAUDE_PLUGIN_ROOT}/skills/configurator-recipes/templates/skeleton.yml config.yml
```

4. **Basic customization** (optional):
   Ask if user wants to set basics now:
   - Channel name
   - Currency code (USD, EUR, GBP, etc.)
   - Country code (US, DE, GB, etc.)

5. **Validate** YAML syntax:
```bash
python3 -c "import yaml; yaml.safe_load(open('config.yml'))"
```

6. **Next steps**:
```
✓ Created config.yml with Saleor Configurator structure

Next steps:
1. Edit config.yml with your store data
2. /configurator validate - Check for issues
3. /recipe [type] - Apply a pre-built recipe
4. Deploy when ready

For pre-built templates: /recipe
For discovery from website: /discover
```

## Operation: validate

Comprehensive validation with schema checks, best practices, and common mistake detection.

### Validation Phases

**Phase 1: YAML Syntax**
- Indentation consistency
- Missing colons, invalid characters
- Quote matching

**Phase 2: Schema Validation**
For each entity type, check required fields:
- Channels: name, slug, currencyCode, defaultCountry
- Product Types: name, isShippingRequired, attribute references
- Categories: name, slug, no circular references
- Products: name, slug, productType, category, variants
- Variants: sku, prices, attribute values

**Phase 3: Reference Integrity**
All cross-entity references must be valid:
- Product → ProductType, Category, Channel
- Variant → Warehouse
- ProductType → Attribute, TaxClass
- Menu → Category/Collection/Page

**Phase 4: Best Practices**
- Naming conventions (lowercase slugs with hyphens)
- Configuration completeness (active channels, prices set)
- SEO considerations (descriptions present)

**Phase 5: Common Mistakes**
- Duplicate identifiers (slugs, SKUs, names)
- Invalid references
- Missing required data
- Logical inconsistencies (digital products with shipping)

### Output Format

```
═══════════════════════════════════════════════════
  Saleor Configuration Validation Report
═══════════════════════════════════════════════════

✓ YAML Syntax: Valid
✓ Schema Compliance: 45/45 entities valid

⚠ WARNINGS (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Product "old-tshirt" has no description
   → Consider adding for SEO

2. Channel "test-store" is not active
   → Won't be visible to customers

✗ ERRORS (1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Product references unknown productType "NonExistent"
   → Available: T-Shirt, Pants, Accessory
   → Fix at line 145

═══════════════════════════════════════════════════
  Summary: 1 error, 2 warnings
  Status: ✗ FAILED - Fix errors before deployment
═══════════════════════════════════════════════════
```

### Next Steps

**If valid**:
- Preview: `npx configurator diff --url=$URL --token=$TOKEN`
- Deploy: `npx configurator deploy --url=$URL --token=$TOKEN`

**If errors**:
- Use `/configurator edit` to fix issues
- Run `/configurator validate` again

## Operation: edit

Interactive menu for modifying existing configuration.

### Main Menu

Present options via AskUserQuestion:
1. Add new entity (product type, category, product, etc.)
2. Modify existing entity
3. Remove entity
4. View configuration summary
5. Validate configuration

### Entity Types

Available entities:
- Channel
- Product Type
- Category
- Collection
- Product
- Attribute
- Shipping Zone
- Warehouse
- Tax Class
- Menu
- Page

### Add Entity Workflow

For each entity type, gather required fields:

**Channel**:
- Display name → Auto-generate slug
- Currency code
- Default country

**Product Type**:
- Name (unique identifier)
- Shipping required?
- Product-level attributes (name, type, values)
- Variant-level attributes (name, type, values)

**Category**:
- Name → Auto-generate slug
- Parent category (or root)
- Description (optional)

**Product**:
- Name → Auto-generate slug
- Product Type (select from existing)
- Category (select from existing)
- Channel listings (visibility, pricing)
- At least one variant with SKU

### Modify/Remove Entity

1. Select entity type
2. List existing entities
3. Select which one
4. Show current values
5. Make changes or confirm removal

**Dependency warnings** for removals:
- ProductType: Products using it become orphaned
- Category: Child categories and products affected
- Channel: All channel listings removed

### Configuration Summary

```
Configuration Summary
=====================
Channels: 2 (us-store, eu-store)
Product Types: 3 (T-Shirt, Pants, Accessory)
Categories: 12 (in 3-level hierarchy)
Products: 45
Collections: 5
Warehouses: 2
Shipping Zones: 3
```

### Post-Edit Actions

After any modification:
1. Validate YAML syntax
2. Check for broken references
3. Suggest `/configurator validate` for full validation
4. Offer to show diff with remote

## Operation: review

Launch the comprehensive configuration review agent.

### What the Agent Does

The **config-review** agent analyzes config.yml for:
- Schema compliance issues
- Best practice violations
- Common configuration mistakes
- SEO concerns
- Performance considerations
- Security issues

### Review Output

Findings are confidence-scored:
- **Critical (90-100)**: Must fix before deployment
- **High (75-89)**: Should fix for best practices
- **Medium (60-74)**: Consider fixing
- **Low (<60)**: Optional improvements

### When to Use

Run review:
- Before first deployment
- After major configuration changes
- After importing data
- Periodically for maintenance

The agent is automatically triggered after:
- `/configurator init` completes
- `/configurator edit` makes changes
- `/recipe` applies a template
- `/discover` generates config

## No Argument Behavior

If `/configurator` is called without arguments, show interactive menu:

**Question**: "What would you like to do with your configuration?"
**Options**:
1. Initialize new config.yml
2. Validate existing config
3. Edit configuration
4. Review configuration
5. View summary

## Skills Referenced

- `configurator-cli` for CLI commands
- `configurator-schema` for config structure
- `saleor-domain` for entity relationships

## Related Commands

- `/recipe` - Apply pre-built store templates
- `/discover` - Generate config from existing website
- `/configurator-model` - Product modeling wizard
