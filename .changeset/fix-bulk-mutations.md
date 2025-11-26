---
"@saleor/configurator": patch
---

Fixed two bugs in bulk variant creation:

- Removed invalid `path` field from top-level errors query in `productVariantBulkCreate` mutation that caused GraphQL validation errors
- Fixed "Product not available in channels" error by reordering operations to update product channel listings before creating variants with channel listings
