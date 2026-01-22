---
"@saleor/configurator": patch
---

fix: add pagination to product fetching and surface errors to CLI

- Fixed pagination bug in `getProductsBySlugs` that limited results to 100 products. Configs with >100 products now correctly identify existing products for updates instead of incorrectly trying to create them.
- Connected error surfacing infrastructure to CLI: product failures now display with entity-level details and actionable suggestions instead of being silently logged.
- Added "Slug already exists" suggestion to help users understand when products already exist in Saleor.
