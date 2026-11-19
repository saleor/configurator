---
"@saleor/configurator": patch
---

`introspect` and `diff` now read every category, product type, page type, warehouse, shipping zone, tax class, collection, menu and model. Previously each list stopped at the first 50, so larger stores got an incomplete config file. Collections now list all their products instead of the first 20.
