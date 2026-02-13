# Quickstart: Global Attributes Feature

**Feature**: 003-global-attributes
**Date**: 2026-02-03

## Overview

This feature introduces two new top-level YAML sections: `productAttributes` and `contentAttributes`. These replace the unified `attributes` section and solve attribute reference resolution failures during parallel deployment.

## New YAML Structure

### Before (No Longer Supported)

```yaml
# OLD FORMAT - WILL FAIL VALIDATION
attributes:
  - name: Publisher
    inputType: PLAIN_TEXT
    type: PRODUCT_TYPE
  - name: Author
    inputType: PLAIN_TEXT
    type: PAGE_TYPE

productTypes:
  - name: Book
    productAttributes:
      - name: Publisher        # Inline definition - NOT ALLOWED
        inputType: PLAIN_TEXT
```

### After (New Format)

```yaml
# NEW FORMAT - CORRECT
productAttributes:
  - name: Publisher
    inputType: PLAIN_TEXT
  - name: Genre
    inputType: DROPDOWN
    values:
      - name: Fantasy
      - name: Science Fiction
  - name: Condition
    inputType: DROPDOWN
    values:
      - name: MINT
      - name: VG+

contentAttributes:
  - name: Author
    inputType: PLAIN_TEXT
  - name: Scent Family
    inputType: DROPDOWN
    values:
      - name: Citrus
      - name: Woody

productTypes:
  - name: Board Game
    productAttributes:
      - attribute: Publisher    # Reference only
      - attribute: Genre
    variantAttributes:
      - attribute: Condition

modelTypes:
  - name: Scent Profile
    attributes:
      - attribute: Scent Family  # Reference only
      - attribute: Author
```

## Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| Attribute sections | Single `attributes` | Separate `productAttributes` and `contentAttributes` |
| Type field | Required in each attribute | Not needed (section implies type) |
| Inline definitions | Allowed in productTypes | **Not allowed** (references only) |
| Reference format | `{ attribute: "Name" }` | Same (unchanged) |

## Migration Steps

### Option 1: Automatic Migration (Recommended)

```bash
# Generate new format from existing Saleor instance
rm config.yml
saleor-configurator introspect --url <URL> --token <TOKEN>
```

### Option 2: Manual Migration

1. **Split attributes by type**:
   - Move `type: PRODUCT_TYPE` attributes to `productAttributes`
   - Move `type: PAGE_TYPE` attributes to `contentAttributes`
   - Remove `type` field from each attribute

2. **Convert inline definitions to references**:
   ```yaml
   # Change this:
   productTypes:
     - name: Book
       productAttributes:
         - name: Publisher
           inputType: PLAIN_TEXT

   # To this:
   productAttributes:
     - name: Publisher
       inputType: PLAIN_TEXT

   productTypes:
     - name: Book
       productAttributes:
         - attribute: Publisher
   ```

3. **Remove old `attributes` section** if present

## Validation Errors

### Inline Attribute Definition

```
ERROR: productTypes "Book" contains inline attribute definitions: Publisher, Genre.
Inline attribute definitions are no longer supported.

Suggestions:
  • Run 'saleor-configurator introspect' to generate YAML in the correct format
  • Move attribute definitions to the 'productAttributes' section
  • Use '{ attribute: "Name" }' references in productTypes
```

### Attribute Not Found

```
ERROR: productTypes "Book" references attribute "Publsher" which does not exist
in productAttributes.

Suggestions:
  • Did you mean: 'Publisher'?
  • Add "Publsher" to the productAttributes section
  • Check for typos in the attribute name
```

### Wrong Attribute Type

```
ERROR: productTypes "Book" references attribute "Author" which exists but is a
content attribute, not a product attribute.

Suggestions:
  • Move "Author" from contentAttributes to productAttributes
  • Create a separate attribute with this name in productAttributes
  • Use a different attribute that exists in productAttributes
```

## Deployment Order

The deployment pipeline processes attributes before any entity that uses them:

```
1. validationStage        ← Checks for inline definitions (FAILS FAST)
2. shopSettingsStage
3. taxClassesStage
4. attributesStage        ← Creates productAttributes, then contentAttributes
5. productTypesStage      ← Uses cached product attributes
6. channelsStage
7. pageTypesStage
8. modelTypesStage        ← Uses cached content attributes
...
```

## Common Questions

### Q: Can I use the same attribute name in both sections?

**A**: Yes, but they are separate attributes in Saleor. `productAttributes.Publisher` and `contentAttributes.Publisher` are different attributes.

### Q: What happens to existing attributes in Saleor?

**A**: They are not affected. When you deploy, the configurator creates or updates attributes to match your config. Existing attributes not in your config remain unchanged.

### Q: Do I need to reference all attributes?

**A**: No. You can define attributes in `productAttributes` that aren't referenced by any productType. They will still be created as "unassigned" attributes.

### Q: How do I see what will change before deploying?

**A**: Use the `diff` command:
```bash
saleor-configurator diff --url <URL> --token <TOKEN>
```

Output will show:
```
Product Attributes:
  + Publisher (PLAIN_TEXT)
  ~ Genre (PLAIN_TEXT → DROPDOWN)

Content Attributes:
  + Author (PLAIN_TEXT)
```

## Files Changed

| File | Change Type |
|------|-------------|
| `src/modules/config/schema/schema.ts` | Modified - Add new sections |
| `src/modules/config/schema/global-attributes.schema.ts` | New |
| `src/modules/attribute/attribute-cache.ts` | New |
| `src/modules/config/config-service.ts` | Modified - Split by type |
| `src/core/deployment/stages.ts` | Modified - Cache population |
| `src/core/deployment/types.ts` | Modified - Add cache to context |
| `src/core/validation/preflight.ts` | Modified - Inline detection |

## Testing

```bash
# Run all tests
pnpm test

# Run feature-specific tests
pnpm test src/modules/config
pnpm test src/core/deployment

# E2E validation
rm -rf config.yml
pnpm dev introspect --url <URL> --token <TOKEN>
# Make changes to config.yml
pnpm dev deploy --url <URL> --token <TOKEN>
pnpm dev deploy --url <URL> --token <TOKEN>  # Should show no changes
rm config.yml
pnpm dev introspect --url <URL> --token <TOKEN>
pnpm dev diff --url <URL> --token <TOKEN>    # Should show no diff
```
