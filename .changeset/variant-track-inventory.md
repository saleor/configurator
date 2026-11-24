---
"@saleor/configurator": patch
---

Variants have a `trackInventory` field, and `deploy` no longer turns inventory tracking on for every variant it creates or updates. `introspect` writes the store's value. A variant without the field keeps its current setting, and a new one uses the shop's `trackInventoryByDefault`.
