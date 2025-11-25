---
"@saleor/configurator": patch
---

**Bug Fixes for Bulk Mutations**

Fixed critical issues discovered during bulk mutations optimization testing:

- **CXE-1194**: Fixed variant creation failing silently. `productVariantBulkCreate` now receives `product: ID!` at mutation level instead of inside variant inputs.
- **CXE-1195**: Added `isAvailableForPurchase` and `availableForPurchaseAt` to product channel listing introspection and deployment.
- **CXE-1196**: Fixed menu URL validation errors on deploy. URLs are now properly coerced to strings and trimmed.
- **CXE-1197**: Fixed SKU defaulting to variant ID during introspection. Empty SKUs now remain empty for idempotent config files.
