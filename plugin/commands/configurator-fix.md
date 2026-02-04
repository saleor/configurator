---
name: configurator-fix
description: Debug and auto-fix common config.yml issues with plain language explanations and before/after examples
allowed-tools: Read, Write, Edit, AskUserQuestion, Bash
argument-hint: [--auto-fix]
---

# Configurator Fix

Intelligent debugging and fixing for config.yml issues. This command reads your configuration, identifies problems, explains them in plain language, and offers to automatically fix common issues.

## Usage

```bash
# Interactive fixing (recommended)
/configurator-fix

# Auto-fix without prompts
/configurator-fix --auto-fix

# Check only (no fixes)
/configurator-fix --check-only
```

## What This Command Does

Unlike `/configurator validate` which shows technical validation errors, this command:

✅ **Explains errors in plain language**
✅ **Shows line numbers and context**
✅ **Provides before/after examples**
✅ **Offers to auto-fix common issues**
✅ **Suggests manual fixes for complex issues**

## Workflow

### Step 1: Check for config.yml

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

If no config exists, inform user and suggest `/configurator init`.

### Step 2: Read and Analyze

Read config.yml and identify issues:

**Auto-fixable issues** (can be fixed automatically):
- Invalid slugs (spaces, uppercase, underscores)
- Missing required fields with obvious defaults
- Duplicate identifiers (with renaming)
- YAML syntax errors (unclosed quotes, indentation)
- Invalid currency/country codes (common typos)

**Manual-fix issues** (require user decision):
- Missing referenced entities (productType, category, etc.)
- Logical inconsistencies (digital products with shipping)
- Empty collections
- Products without variants

### Step 3: Present Issues with Context

For each issue, show:

```
Issue Type: [Error/Warning]
Line: [line number]
Context: [code snippet from file]
Problem: [plain language explanation]
Impact: [what will happen if not fixed]
Fix: [specific solution]
[Auto-fix available] or [Manual fix required]
```

**Example output format:**

```
═══════════════════════════════════════════════════
  Configuration Issues Found: 4
═══════════════════════════════════════════════════

❌ ERROR #1 (Line 45)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context:
  43 | products:
  44 |   - name: "Fancy T-Shirt"
> 45 |     productType: "TShirt"
  46 |     slug: "fancy-tshirt"

Problem: Product references unknown productType "TShirt"

Available productTypes:
  - T-Shirt
  - Pants
  - Accessory

Fix: Change "TShirt" to "T-Shirt"

Impact: Deployment will fail - product cannot be created without valid productType

[Auto-fix available]

⚠️ WARNING #2 (Line 67)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context:
  65 | categories:
  66 |   - name: "My Category"
> 67 |     slug: "My Category"
  68 |     children: []

Problem: Slug contains spaces and uppercase letters

Slugs must be:
  - Lowercase only
  - Use hyphens (not spaces or underscores)
  - No special characters

Fix: Change "My Category" to "my-category"

Impact: Invalid slug format may cause deployment errors

[Auto-fix available]

❌ ERROR #3 (Line 89)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context:
  87 |     variants:
  88 |       - attributes:
> 89 |           - name: "Size"
  90 |             value: "M"
  91 |         # Missing SKU

Problem: Variant is missing required field "sku"

Every variant must have a unique SKU for inventory tracking.

Fix: Add a SKU field, for example:
  sku: "fancy-tshirt-m-blue"

Impact: Deployment will fail - variants require SKUs

[Manual fix required - need unique identifier]

⚠️ WARNING #4 (Line 102)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Context:
  100 | products:
  101 |   - name: "Digital Download"
> 102 |     isShippingRequired: true
  103 |     productType: "Digital Product"

Problem: Digital product has shipping enabled

Digital products typically don't require shipping.

Fix: Change isShippingRequired to false

Impact: Users will be prompted for shipping address unnecessarily

[Auto-fix available]

═══════════════════════════════════════════════════
  Summary: 2 errors, 2 warnings
  Auto-fixable: 3 issues
  Manual fixes needed: 1 issue
═══════════════════════════════════════════════════
```

### Step 4: Offer Auto-fixes

If `--auto-fix` flag is NOT present, ask user:

**Question**: "Found 3 auto-fixable issues. Would you like me to fix them automatically?"
**Options**:
- Fix all automatically
- Review each fix individually
- Skip auto-fixes (show manual instructions only)

### Step 5: Apply Auto-fixes

For each auto-fixable issue:

**If "Review individually"**: Show before/after for each fix and ask for confirmation

**If "Fix all automatically"**: Apply all fixes and show summary

Use Edit tool for surgical changes:

```yaml
# Fix invalid slug
old_string: 'slug: "My Category"'
new_string: 'slug: "my-category"'

# Fix productType reference
old_string: 'productType: "TShirt"'
new_string: 'productType: "T-Shirt"'

# Fix shipping requirement
old_string: 'isShippingRequired: true'
new_string: 'isShippingRequired: false'
```

### Step 6: Manual Fix Instructions

For issues that can't be auto-fixed, provide step-by-step instructions:

```
Manual Fixes Required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Add SKU to variant (Line 89)

   Current:
   variants:
     - attributes:
         - name: "Size"
           value: "M"

   Fix:
   variants:
     - sku: "fancy-tshirt-m"  ← Add this line
       attributes:
         - name: "Size"
           value: "M"

   Choose a unique identifier (letters, numbers, hyphens only)

Would you like me to:
- Generate SKU suggestions based on product name and attributes?
- Open the file for manual editing?
- Skip for now?
```

### Step 7: Validation After Fixes

After applying fixes, validate the configuration:

```bash
python3 -c "import yaml; yaml.safe_load(open('config.yml'))"
```

Show summary:

```
✓ Applied 3 auto-fixes successfully

Fixed issues:
  - Line 45: Updated productType reference
  - Line 67: Fixed invalid slug format
  - Line 102: Disabled shipping for digital product

Remaining issues: 1 manual fix needed

Next steps:
1. Address manual fix (variant SKU at line 89)
2. Run /configurator-fix again to verify
3. Deploy when ready: npx configurator deploy
```

## Common Auto-fixable Issues

### Invalid Slugs

**Problem**: Spaces, uppercase, underscores in slugs
**Detection**: Regex check for `[A-Z\s_]`
**Fix**: Convert to lowercase, replace spaces/underscores with hyphens

```yaml
# Before
slug: "My_Cool Product"

# After
slug: "my-cool-product"
```

### Typo in Entity References

**Problem**: `productType: "TShirt"` when it should be `"T-Shirt"`
**Detection**: Check if reference exists, look for similar names
**Fix**: Fuzzy match to find correct entity name

```yaml
# Before
productType: "TShirt"  # Doesn't exist

# After
productType: "T-Shirt"  # Exists
```

### Missing Currency/Country Codes

**Problem**: Invalid ISO codes
**Detection**: Check against known ISO 4217 / ISO 3166-1 codes
**Fix**: Suggest closest match or common default

```yaml
# Before
currencyCode: "DOLLARS"  # Invalid

# After
currencyCode: "USD"  # Valid ISO 4217
```

### YAML Syntax Errors

**Problem**: Unclosed quotes, wrong indentation
**Detection**: Try parsing with PyYAML, check error messages
**Fix**: Add closing quotes, fix indentation

```yaml
# Before
name: "Unclosed quote
description: "Test"

# After
name: "Unclosed quote"
description: "Test"
```

### Duplicate Identifiers

**Problem**: Two products with same slug
**Detection**: Track all slugs/SKUs in sets
**Fix**: Append number to duplicate

```yaml
# Before
products:
  - slug: "tshirt"
  - slug: "tshirt"  # Duplicate

# After
products:
  - slug: "tshirt"
  - slug: "tshirt-2"  # Auto-renamed
```

## Issues Requiring Manual Fixes

### Missing Referenced Entities

**Problem**: Product references non-existent category
**Fix**: User must either:
  - Create the missing category
  - Change reference to existing category
  - Remove the product

**Guidance**: Show existing categories and suggest which to use

### Missing Required Fields

**Problem**: Variant without SKU, product without name
**Fix**: User must provide the value (can't be auto-generated safely)

**Guidance**: Show example format and best practices

### Logical Inconsistencies

**Problem**: Digital product with shipping zones assigned
**Fix**: User decides intent (maybe it's a physical digital product box?)

**Guidance**: Explain the inconsistency and ask for clarification

## Command Arguments

### `--auto-fix`

Apply all auto-fixes without prompting

```bash
/configurator-fix --auto-fix
```

### `--check-only`

Identify issues but don't offer to fix

```bash
/configurator-fix --check-only
```

Use case: Just want to see what's wrong before making changes

## Integration with Other Commands

After fixing issues, suggest:

```
Configuration fixed! Next steps:

1. Validate: /configurator validate
   → Comprehensive validation check

2. Review: /configurator review
   → Agent-based quality review

3. Preview: npx configurator diff --url=$URL --token=$TOKEN
   → See what will change in Saleor

4. Deploy: npx configurator deploy --url=$URL --token=$TOKEN
   → Apply changes to your store
```

## Error Handling

**If config.yml doesn't exist**:
```
No config.yml found.

Create one with:
  /configurator init       - Empty skeleton
  /recipe [type]           - Pre-built template
  /discover                - From existing site
```

**If config.yml is completely invalid YAML**:
```
config.yml has critical YAML syntax errors:

Line 15: mapping values are not allowed here

This needs to be fixed manually before I can analyze further.

Common issues:
- Missing colon after key
- Wrong indentation (use 2 spaces)
- Unclosed quotes or brackets

Would you like me to:
- Show the problematic section
- Suggest YAML validation resources
- Create a backup and start fresh
```

**If all issues are already fixed**:
```
✓ No issues found!

Your configuration looks good.

Next steps:
- /configurator validate - Full validation
- /configurator review   - Agent quality check
- Deploy when ready
```

## Skills Referenced

- `configurator-schema` for valid field values
- `saleor-domain` for entity relationships
- `configurator-cli` for deployment commands

## Related Commands

- `/configurator validate` - Comprehensive technical validation
- `/configurator review` - Agent-based quality review
- `/configurator edit` - Interactive editing
- `/configurator` - Main command hub
