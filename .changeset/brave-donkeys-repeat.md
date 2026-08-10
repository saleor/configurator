---
"@saleor/configurator": patch
---

Fixed `deploy` rejecting a configuration that `introspect` had just produced.

Saleor enforces attribute uniqueness on slug, not name, so a store can legitimately hold a `PRODUCT_TYPE` and a `PAGE_TYPE` attribute with the same name — for example two attributes both called "Related Products". Introspect writes each into its own section, but preflight validation then refused any name appearing in both `productAttributes` and `contentAttributes`, so deploying an unmodified introspected config failed with:

```
Attribute names must be unique across productAttributes and contentAttributes
```

That rule has been removed. It was stricter than the deployment path requires: attribute resolution is scoped by type at every step — the attribute cache keeps a separate bucket per section, and attribute lookups filter on `type` — so a name shared across sections is never ambiguous. Duplicate names *within* a single section are still rejected.
