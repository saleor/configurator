---
name: configurator-init
description: Initialize a new config.yml with the correct structure and validation comments
allowed-tools: Bash, Read, Write, AskUserQuestion
argument-hint: [--force]
---

# Configurator Init

Initialize a new `config.yml` with the correct Saleor Configurator structure.

## Process

### 1. Check for Existing Config

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

**If config.yml exists** and `--force` not provided, ask user:
- **Backup and replace**: Create `config.yml.backup` then overwrite
- **Cancel**: Abort initialization

### 2. Copy Skeleton Template

The skeleton template is at:
```
${CLAUDE_PLUGIN_ROOT}/skills/configurator-recipes/templates/skeleton.yml
```

Copy it to `config.yml` in the current directory.

### 3. Basic Customization (Optional)

Ask user if they want to set basic values now:

**Question**: "Would you like to set your store basics now?"

If yes, ask for:
1. **Channel name** (e.g., "My Store")
2. **Currency code** (USD, EUR, GBP, etc.)
3. **Country code** (US, DE, GB, etc.)

Apply these to the config using Edit tool.

### 4. Validate

```bash
python3 -c "import yaml; yaml.safe_load(open('config.yml'))"
```

### 5. Next Steps

```
✓ Created config.yml with Saleor Configurator structure

The file contains:
- Required sections with placeholder values
- Commented examples for optional sections
- Field documentation ([REQUIRED] vs [OPTIONAL])

Next steps:
1. Edit config.yml to add your store configuration
2. Run /configurator-validate to check your changes
3. Deploy: npx configurator deploy --url=$SALEOR_API_URL --token=$SALEOR_TOKEN

For pre-built store templates, use /configurator-setup and select a recipe.
For schema validation: ./plugin/scripts/validate-config.sh
```

## Notes

- The skeleton shows the **structure**, not business content
- For complete store templates (fashion, electronics, etc.), use `/configurator-setup`
- The JSON schema at `schemas/config.schema.json` can be used for IDE validation
