---
"@saleor/configurator": minor
---

Add variant selector attribute configuration to product types

Users can now specify which variant attributes should be used for variant selection in storefronts (e.g., Size, Color dropdowns) via the `variantSelection` property.

**New Features:**
- `variantSelection: true` on variant attributes in YAML config
- Introspect outputs `variantSelection` for enabled attributes (omits when false for cleaner YAML)
- Diff shows variant selection changes
- Validation ensures only supported input types (`DROPDOWN`, `BOOLEAN`, `SWATCH`, `NUMERIC`) can use variant selection
- Works with both inline and referenced attributes

**Example:**
```yaml
productTypes:
  - name: T-Shirt
    variantAttributes:
      - name: Size
        inputType: DROPDOWN
        variantSelection: true
        values:
          - name: Small
          - name: Medium
          - name: Large
      - name: Color
        inputType: SWATCH
        variantSelection: true
```
