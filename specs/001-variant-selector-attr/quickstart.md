# Quickstart: Variant Selector Attribute Configuration

**Date**: 2026-01-19
**Feature**: 001-variant-selector-attr

## What This Feature Does

Allows you to configure which variant attributes should be used for variant selection in storefronts. For example, when a customer views a T-shirt product, they see Size and Color dropdowns to select their preferred variant.

---

## Usage Examples

### Basic: Enable Variant Selection on Size and Color

```yaml
productTypes:
  - name: Apparel
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        variantSelection: true  # Shows as variant selector
        values:
          - name: Small
          - name: Medium
          - name: Large
      - name: Color
        inputType: SWATCH
        variantSelection: true  # Shows as color swatch picker
        values:
          - name: Red
            value: "#FF0000"
          - name: Blue
            value: "#0000FF"
      - name: Material
        inputType: DROPDOWN
        # variantSelection omitted = false (not a selector)
        values:
          - name: Cotton
          - name: Polyester
```

### Using Referenced Attributes

```yaml
# Define the attribute once
attributes:
  - name: Size
    slug: size
    inputType: DROPDOWN
    values:
      - name: Small
      - name: Medium
      - name: Large

productTypes:
  - name: Apparel
    variantAttributes:
      - slug: size              # Reference by slug
        variantSelection: true  # Enable variant selection
  - name: Footwear
    variantAttributes:
      - slug: size              # Same attribute, different product type
        variantSelection: true
```

---

## Supported Input Types

Only these input types support `variantSelection: true`:

| Input Type | Use Case |
|------------|----------|
| `DROPDOWN` | Text-based selections (Size: S/M/L) |
| `BOOLEAN` | Yes/No selections (Gift wrap: Yes/No) |
| `SWATCH` | Color pickers with visual swatches |
| `NUMERIC` | Numeric selections (Weight: 100g, 200g) |

**Note**: Setting `variantSelection: true` on other input types (e.g., `PLAIN_TEXT`, `RICH_TEXT`) will result in a validation error.

---

## CLI Commands

### Deploy Configuration

```bash
# Deploy config with variant selection settings
pnpm dev deploy --url=YOUR_SALEOR_URL --token=YOUR_TOKEN
```

### Introspect Existing Configuration

```bash
# Fetch current configuration including variant selection
pnpm dev introspect --url=YOUR_SALEOR_URL --token=YOUR_TOKEN
```

Output will include `variantSelection: true` for enabled attributes:
```yaml
productTypes:
  - name: Apparel
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        variantSelection: true  # Currently enabled
```

### Preview Changes

```bash
# See what will change before deploying
pnpm dev diff --url=YOUR_SALEOR_URL --token=YOUR_TOKEN
```

Diff output shows variant selection changes:
```
ProductType: Apparel
  Variant Attribute: Size
    variantSelection: false → true
```

---

## Common Scenarios

### Scenario 1: Enable Variant Selection on Existing Attribute

1. Run `introspect` to get current config
2. Add `variantSelection: true` to desired variant attribute
3. Run `diff` to verify the change
4. Run `deploy` to apply

### Scenario 2: Add New Variant Selector Attribute

1. Add the attribute to `variantAttributes` with `variantSelection: true`
2. Run `deploy` - attribute will be created and assigned with variant selection enabled

### Scenario 3: Disable Variant Selection

1. Remove `variantSelection: true` from the attribute (or set to `false`)
2. Run `deploy` - attribute will be updated to disable variant selection

---

## Validation Errors

### Invalid Input Type

```
Error: variantSelection is only supported for input types: DROPDOWN, BOOLEAN, SWATCH, NUMERIC
  at ProductType "Apparel", variant attribute "Description" (inputType: PLAIN_TEXT)
```

**Fix**: Remove `variantSelection: true` from attributes with unsupported input types.

---

## Best Practices

1. **Limit variant selectors** - Only mark attributes that customers should use to select variants (typically 1-3 attributes per product type)

2. **Use meaningful attributes** - Size, Color, and similar attributes make good variant selectors; internal metadata does not

3. **Consistent across product types** - If multiple product types use the same attribute for variant selection, consider using referenced attributes for consistency

4. **Test in staging first** - Run `diff` to preview changes before deploying to production
