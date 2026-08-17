---
"@saleor/configurator": patch
---

Fixed `deploy` rejecting or failing to create a configuration where attributes in different product, content, or customer sections share the same name.

Saleor enforces attribute uniqueness on slug, not name, so a store can hold `PRODUCT_TYPE`, `PAGE_TYPE`, and `CUSTOMER_TYPE` attributes with the same name — for example attributes called "Related Products" in all three sections. Introspect writes each into its own section, but preflight validation refused any name appearing in both `productAttributes` and `contentAttributes`, so deploying an unmodified introspected config failed with:

```
Attribute names must be unique across productAttributes and contentAttributes
```

That rule has been removed. Attribute resolution is scoped by type, so a name shared across sections is not ambiguous. Configurator also no longer sends a name-derived slug when creating attributes. Saleor generates the globally unique slug instead, which prevents new product, content, or customer attributes with the same name from colliding. Duplicate names *within* a single section are still rejected.
