---
"@saleor/configurator": minor
---

Add global `productAttributes` and `contentAttributes` sections

- **New config sections**: Define shared attributes once in `productAttributes` (PRODUCT_TYPE) and `contentAttributes` (PAGE_TYPE) sections
- **Introspect**: Automatically extracts attributes into separate sections by type
- **Deploy**: Creates attributes before product/page types, uses in-memory cache for fast reference resolution
- **Validation**: Rejects inline attribute definitions with migration guidance; provides "did you mean?" suggestions for typos
- **Diff**: Shows attribute changes grouped under "Product Attributes" and "Content Attributes" headers
- **Deprecation**: Legacy `attributes` section still works but shows deprecation warning
