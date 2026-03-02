---
"@saleor/configurator": minor
---

Add global `productAttributes` and `contentAttributes` sections

Attributes are now defined once and referenced everywhere. Previously, every product type and page type had to repeat full attribute definitions inline — leading to drift, duplication errors, and verbose configs. Now you declare attributes in top-level `productAttributes`/`contentAttributes` sections and reference them by name.

- **New config sections**: Define shared attributes once in `productAttributes` (PRODUCT_TYPE) and `contentAttributes` (PAGE_TYPE) sections, then reference by name in product types, page types, and model types
- **Introspect**: Automatically extracts and deduplicates attributes from the Saleor API into the correct section by type
- **Deploy**: Attributes stage runs first and populates an in-memory cache (with full choice metadata and entity types). Product types, page types, products, and models all resolve attribute values from cache — zero API calls for attribute lookups during deployment
- **Validation**: Rejects inline attribute definitions with migration guidance; provides "did you mean?" suggestions for typos against known attribute names
- **Diff**: Shows attribute changes grouped under "Product Attributes" and "Content Attributes" headers
- **Stage dependencies**: Products and models now correctly depend on the attributes stage (transitive through their types), ensuring the cache is always populated before resolution
- **Saleor API fix**: Enforced `choices(first: 100)` limit on all attribute queries to comply with Saleor's connection page size constraint (was 250, causing silent truncation)
