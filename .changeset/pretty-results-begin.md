---
"saleor-configurator": major
---

Expanded the product attributes model with enhanced attribute support

## What's Changed

- **Product-level attributes** (`productAttributes`): Shared across all variants (e.g., Author, Genre, Publisher, Language)
- **Variant-level attributes** (`variantAttributes`): Specific to each variant (e.g., Format, Edition, ISBN, Page Count)

### Example

```yaml
productTypes:
  - name: Book
    productAttributes:
      - name: Language
        inputType: DROPDOWN
        values:
          - name: English
          - name: Spanish
          - name: French
    variantAttributes:
      - name: Edition
        inputType: DROPDOWN
        values:
          - name: First Edition
          - name: Second Edition
          - name: Revised Edition
```

## Breaking Change

This is a breaking change. You need to migrate from the old `attributes` syntax to the new `productAttributes` and `variantAttributes` syntax in your product type configurations.

Replace the old syntax:

```yaml
productTypes:
  - name: Book
    attributes:
      - name: Author
        inputType: PLAIN_TEXT
```

With the new syntax:

```yaml
productTypes:
  - name: Book
    productAttributes:
      - name: Author
        inputType: PLAIN_TEXT
    variantAttributes:
      - name: Format
        inputType: DROPDOWN
        values:
          - name: Hardcover
          - name: Paperback
```
