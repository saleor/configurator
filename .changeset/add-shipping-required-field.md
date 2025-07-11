---
"saleor-configurator": minor
---

Add isShippingRequired field to product type

Product types now support the `isShippingRequired` boolean field to control whether products of this type require shipping. This defaults to `false` (unshippable by default). 

**Example:**
```yaml
productTypes:
  - name: Book
    isShippingRequired: true
  - name: E-Book
    isShippingRequired: false
```