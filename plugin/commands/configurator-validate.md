---
name: configurator-validate
description: Comprehensive configuration validation with schema checks, best practices, and common mistake detection
allowed-tools: Bash, Read, Grep, Glob
argument-hint: [--strict]
---

# Configurator Validate

You are performing comprehensive validation of the user's Saleor configuration. This goes beyond basic YAML syntax to check schema compliance, best practices, and common mistakes.

## Prerequisites

Check that config.yml exists:

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

If no config exists, inform user and suggest `/configurator-setup`.

## Validation Phases

### Phase 1: YAML Syntax Validation

Check for basic YAML errors:
- Indentation consistency (2 spaces)
- Missing colons
- Invalid characters
- Unclosed quotes
- Tab characters (should be spaces)

### Phase 2: Schema Validation

For each entity type, validate required fields:

#### Channels
- [ ] `name` is present
- [ ] `slug` is present and valid (lowercase, hyphens only)
- [ ] `currencyCode` is valid ISO 4217 (USD, EUR, GBP, etc.)
- [ ] `defaultCountry` is valid ISO 3166-1 (US, DE, GB, etc.)

#### Product Types
- [ ] `name` is present and unique
- [ ] `isShippingRequired` is boolean
- [ ] `productAttributes` reference valid attribute names
- [ ] `variantAttributes` reference valid attribute names
- [ ] `taxClass` references existing tax class (if specified)

#### Categories
- [ ] `name` is present
- [ ] `slug` is present and unique at each level
- [ ] `children` slugs don't conflict with siblings
- [ ] No circular references in hierarchy

#### Products
- [ ] `name` is present
- [ ] `slug` is present and unique
- [ ] `productType` references existing product type
- [ ] `category` references existing category path
- [ ] At least one channel listing
- [ ] At least one variant
- [ ] Channel listings reference existing channels

#### Variants
- [ ] `sku` is present and unique
- [ ] Attribute values match product type's variant attributes
- [ ] Channel listings have valid prices (positive numbers)
- [ ] Stock references existing warehouses

### Phase 3: Reference Integrity

Check that all cross-entity references are valid:

```
Product → ProductType (must exist)
Product → Category (must exist)
Product → Channel (channelListings must reference existing channels)
Variant → Warehouse (stocks must reference existing warehouses)
ProductType → Attribute (must exist or be inline defined)
ProductType → TaxClass (must exist if specified)
ShippingZone → Warehouse (must exist if specified)
Menu → Category/Collection/Page (must exist if specified)
```

### Phase 4: Best Practices Check

#### Naming Conventions
- [ ] Slugs are lowercase with hyphens (not underscores or camelCase)
- [ ] Slugs are descriptive (not `cat-1`, `prod-123`)
- [ ] Names are human-readable

#### Configuration Completeness
- [ ] At least one channel is active
- [ ] Products have channel listings for active channels
- [ ] Variants have prices set for their channel listings
- [ ] Categories are organized (not all at root level)

#### SEO Considerations
- [ ] Products have descriptions
- [ ] Categories have descriptions
- [ ] SEO titles/descriptions where available

### Phase 5: Common Mistakes Detection

Check for patterns that often cause deployment issues:

#### Duplicate Identifiers
- Duplicate slugs within entity type
- Duplicate SKUs
- Duplicate names (for name-identified entities)

#### Invalid References
- Product type that doesn't exist
- Category path that doesn't exist
- Channel that doesn't exist

#### Missing Required Data
- Products without variants
- Variants without prices
- Channels without currency

#### Logical Inconsistencies
- Digital products with shipping required
- Products in non-leaf categories
- Empty collections

## Validation Output Format

Present results in a structured format:

```
═══════════════════════════════════════════════════
  Saleor Configuration Validation Report
═══════════════════════════════════════════════════

✓ YAML Syntax: Valid
✓ Schema Compliance: 45/45 entities valid

⚠ WARNINGS (3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Product "old-tshirt" has no description
   → Consider adding a description for SEO

2. Category "misc" has no children
   → Empty categories may confuse navigation

3. Channel "test-store" is not active
   → Inactive channels won't be visible

✗ ERRORS (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Product "new-product" references unknown productType "NonExistent"
   → Available product types: T-Shirt, Pants, Accessory
   → Line 145 in config.yml

2. Variant "SKU-001" is duplicated
   → Found at lines 156 and 203
   → SKUs must be unique

═══════════════════════════════════════════════════
  Summary: 2 errors, 3 warnings
  Status: ✗ FAILED - Fix errors before deployment
═══════════════════════════════════════════════════
```

## Severity Levels

### Errors (Must Fix)
- Deployment will fail
- Data integrity issues
- Invalid references

### Warnings (Should Fix)
- Best practice violations
- Potential issues
- SEO concerns

### Info (Consider)
- Suggestions for improvement
- Optional enhancements

## Strict Mode

If `--strict` argument is provided:
- Treat warnings as errors
- Require all best practices
- Fail on any issue

## Post-Validation Actions

After validation, offer next steps:

**If valid**:
```
Configuration is valid! Next steps:
1. Preview changes: npx configurator diff --url=$URL --token=$TOKEN
2. Deploy: npx configurator deploy --url=$URL --token=$TOKEN
```

**If errors**:
```
Please fix the errors above before deployment.
Use /configurator-edit to modify specific entities.
Run /configurator-validate again after fixes.
```

## Skills to Reference

- `configurator-schema` for valid field values
- `saleor-domain` for entity relationships
- `configurator-cli` for deployment commands
