---
"@saleor/configurator": patch
---

`diff`, the `deploy` preview and `introspect` now report attributes added to or removed from page types and model types, e.g. `attributes.Author: added`. Before, attributes listed with `attribute:` were never compared. A page type without an `attributes` list leaves its assigned attributes unmanaged on deploy. An attribute assigned only in Saleor is reported as "only in Saleor", and deploy leaves it assigned, as it does for product and customer types.
