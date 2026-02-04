# Migration Guide: v1.0.0 → v2.0.0

This guide helps you migrate from the old plugin structure to the new streamlined version.

## What Changed

### ✅ Completed Changes

1. **Removed all hooks** - They were buggy and causing issues
2. **Consolidated commands** - From 8 commands to 5 focused commands
3. **Improved DX** - Clearer workflows for the two main use cases
4. **Updated documentation** - Streamlined README with better examples

### Command Mapping

| Old Command | New Command | Notes |
|-------------|-------------|-------|
| `/configurator-init` | `/configurator init` | Same functionality, subcommand |
| `/configurator-validate` | `/configurator validate` | Same functionality, subcommand |
| `/configurator-edit` | `/configurator edit` | Same functionality, subcommand |
| `/configurator-review` | `/configurator review` | Same functionality, subcommand |
| `/configurator-setup` | `/recipe` | Enhanced with direct deployment |
| `/configurator-workflow` | `/recipe` or `/discover` | Split into focused workflows |
| `/configurator-model` | `/configurator-model` | **Unchanged** |
| `/configurator-import` | `/configurator-import` | **Unchanged** |

## New Workflows

### Workflow 1: Recipe from Scratch

**Before (v1.0.0)**:
```bash
/configurator-setup
# Follow wizard...
/configurator-validate
/configurator-review
# Then deploy manually
```

**After (v2.0.0)**:
```bash
/recipe fashion --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
# Recipe applied, validated, and deployed in one command!

# Or with customization:
/recipe fashion --customize
```

### Workflow 2: Website Discovery

**Before (v1.0.0)**:
```bash
/configurator-workflow discover
# Complex multi-phase workflow...
```

**After (v2.0.0)**:
```bash
/discover https://yoursite.com
# Intelligent exploration with chrome-devtools MCP

# Or from Saleor instance:
/discover --introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

### Workflow 3: Working with Existing Config

**Before (v1.0.0)**:
```bash
/configurator-validate
/configurator-edit
/configurator-review
```

**After (v2.0.0)**:
```bash
/configurator validate
/configurator edit
/configurator review

# Or just:
/configurator
# Shows interactive menu!
```

## Hooks Removal Impact

### What Hooks Did

The removed hooks provided:
- Automatic context detection on session start
- YAML validation before saving
- Deployment safety warnings
- CLI result analysis
- Config change guidance
- Completion quality gates

### How Functionality is Preserved

**Validation**: Now explicit via `/configurator validate`
- More reliable
- User has full control
- Clear error messages

**Safety**: Built into commands
- `/recipe` and `/discover` validate before applying
- Deployment commands show dry-run first
- Clear confirmation prompts

**Guidance**: Agent-based
- `config-review` agent for comprehensive checks
- `troubleshoot` agent for deployment issues
- Clear next-step suggestions in command output

**No more silent failures or confusing hook errors!**

## Testing the New Plugin

### 1. Test Core Operations

```bash
# Initialize
/configurator init

# Edit
/configurator edit
# Try adding a channel, product type, category

# Validate
/configurator validate

# Review
/configurator review
```

### 2. Test Recipe Workflow

```bash
# Interactive
/recipe
# Select fashion

# Direct
/recipe electronics

# With deployment
/recipe food --url=$SALEOR_API_URL --token=$SALEOR_TOKEN
```

### 3. Test Discovery Workflow

```bash
# Website exploration (requires chrome-devtools MCP)
/discover https://example.com

# Saleor introspection
/discover --introspect --url=$SALEOR_API_URL --token=$SALEOR_TOKEN

# Manual input (fallback)
/discover
# Select "Manual input"
```

### 4. Test Unchanged Commands

```bash
# Product modeling
/configurator-model

# Data import
/configurator-import
```

## Verification Checklist

After migration, verify:

- [ ] Plugin loads without errors
- [ ] `/configurator` shows menu or subcommand help
- [ ] `/recipe` lists available recipes
- [ ] `/discover` prompts for discovery method
- [ ] `/configurator-model` works as before
- [ ] `/configurator-import` works as before
- [ ] No hook-related errors appear
- [ ] Commands complete successfully
- [ ] Agents trigger appropriately (config-review, troubleshoot)

## Troubleshooting

### "Command not found"

Make sure you're using the new command names:
- Old: `/configurator-setup` → New: `/recipe`
- Old: `/configurator-validate` → New: `/configurator validate`

### "chrome-devtools not available"

For `/discover` website exploration:
1. Install chrome-devtools MCP
2. Or use introspection mode
3. Or use manual input fallback

### "Missing validation"

Validation is now explicit:
- Run `/configurator validate` before deployment
- Or `/configurator review` for comprehensive check

## Benefits of v2.0.0

✅ **Simpler**: 5 focused commands vs 8 scattered commands
✅ **Clearer**: Two main workflows are obvious
✅ **More reliable**: No buggy hooks
✅ **Better DX**: Smart defaults, fewer steps
✅ **Flexible**: Optional chrome-devtools integration
✅ **Faster**: Direct deployment support in `/recipe`

## Questions?

- Check `README.md` for updated documentation
- Review `CHANGELOG.md` for detailed changes
- Commands now have `--help` information in their markdown files
