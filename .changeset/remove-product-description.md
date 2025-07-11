---
"saleor-configurator": patch
---

Remove support for description field in products

The description field has been removed from the product schema as it was not being used by the product service. This simplifies the product configuration and removes unused fields.