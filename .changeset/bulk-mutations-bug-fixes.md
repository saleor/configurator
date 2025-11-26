---
"@saleor/configurator": patch
---

**Bug Fixes for Bulk Mutations Optimization**

Fixed critical issues discovered during bulk mutations testing:

- **CXE-1108**: REFERENCE attributes now include `entityType` during introspection. Added validation that throws clear errors when REFERENCE attributes are missing required entityType.
- **CXE-1194**: Fixed variant creation failing silently. `productVariantBulkCreate` now receives `product: ID!` at mutation level.
- **CXE-1195**: Added `isAvailableForPurchase` and `availableForPurchaseAt` to product channel listing introspection.
- **CXE-1196**: Fixed menu URL validation errors. URLs are now properly coerced to strings.
- **CXE-1197**: Fixed SKU defaulting to variant ID. Empty SKUs now remain empty.
- **GraphQL Fix**: Removed invalid `path` field from bulk mutation error queries.
- **Channel Fix**: Reordered operations to update product channel listings before creating variants.
