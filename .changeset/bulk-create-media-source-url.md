---
"@saleor/configurator": patch
---

Media on newly created products now keep their configured `externalUrl`. On a product's first deploy the source URL wasn't stored, so `introspect` wrote Saleor's thumbnail URL instead and the next `diff` reported the media as changed.
