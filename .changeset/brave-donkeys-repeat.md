---
"@saleor/configurator": patch
---

Fixed `deploy` rejecting or failing to create a configuration where a product attribute and a content attribute share the same name.

Saleor enforces attribute uniqueness on slug, not name, so a store can legitimately hold a `PRODUCT_TYPE` and a `PAGE_TYPE` attribute with the same name — for example two attributes both called "Related Products". Introspect writes each into its own section, but preflight validation then refused any name appearing in both `productAttributes` and `contentAttributes`, so deploying an unmodified introspected config failed with:

```
Attribute names must be unique across productAttributes and contentAttributes
```

That rule has been removed. Attribute resolution is scoped by type, so a name shared across sections is not ambiguous. Configurator also no longer sends a name-derived slug when creating attributes. Saleor generates the globally unique slug instead, which prevents two new attributes with the same name from colliding. Duplicate names *within* a single section are still rejected.
