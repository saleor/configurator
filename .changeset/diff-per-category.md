---
"@saleor/configurator": minor
---

`diff`, the `deploy` preview and `introspect` now report each category on its own, including subcategories. Before, changes to subcategories were folded into their top-level category, a renamed subcategory was never detected (deploy reported no changes), and a subcategory missing from the config showed as a change to its parent. A subcategory moved to another parent is reported as a `parent` change on that category; Saleor can't move categories, so deploy leaves it where it is.

Every change now reads the same in `diff`, the deploy preview, `introspect` and PR comments: the path to the changed value, then what happens there, e.g. `variants.TEE-S.weight: 1 → 2` or `countries: added SE`. Lists such as shipping methods, countries and channel listings are compared item by item. The `introspect` preview now shows values in the right order (file → Saleor); it used to show them reversed.

In JSON and library output, each change has a new `path` (one segment per key) and `kind` (`changed`, `added` or `removed`). Match on `path`: `field` is now the path joined with dots and, like `description`, is display text, so some values read differently, e.g. `items/Home.url` becomes `items.Home.url` and `countryRates` becomes `countryRates.FI`.
