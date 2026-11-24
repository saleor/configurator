---
"@saleor/configurator": patch
---

`deploy` now fails a collection or menu that references a product, channel, category, collection or page that doesn't exist, and names the missing references. Before, it logged a warning, skipped the reference and still reported success.
