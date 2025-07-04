---
"saleor-configurator": minor
---

Added referencing existing attributes by name

Instead of providing the same attribute input several times, you can now declare it once and reference it by name in the product type input.

**Example:**

```yaml
productTypes:
  - name: Book
    productAttributes:
      - name: Author
        inputType: PLAIN_TEXT
      - name: Genre
        inputType: DROPDOWN
        values:
          - name: Fiction
          - name: Non-Fiction
          - name: Fantasy
  - name: E-Book
    productAttributes:
      - attribute: Author # Reference an existing attribute by slug
      - attribute: Genre # Reference an existing attribute by slug
      - name: File Format # New attribute
        inputType: DROPDOWN
        values:
          - name: PDF
          - name: EPUB
          - name: MOBI
```
