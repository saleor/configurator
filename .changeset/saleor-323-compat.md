---
"@saleor/configurator": patch
---

Update GraphQL compatibility for Saleor 3.23.

- Bump `saleor.schemaVersion` to `3.23` and regenerate GraphQL schema/types.
- Replace outdated model page attribute assignment mutations with `pageUpdate` attribute updates.
- Add required `product` argument to `productVariantBulkUpdate` and fix channel lookup query variable usage.
- Remove obsolete `automaticFulfillmentDigitalProducts` from shop settings mutation selection.
- Update troubleshooting compatibility notes and related tests to match 3.23 behavior.
