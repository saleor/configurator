---
"@saleor/configurator": patch
---

Fixed entity identification to use slugs instead of names for categories and channels. Entities with the same name but different slugs are now correctly handled as separate entities, resolving duplicate detection issues. Also improved validation method naming from `validateUniqueNames` to `validateUniqueIdentifiers` for clarity.
