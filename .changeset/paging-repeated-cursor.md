---
"@saleor/configurator": patch
---

`introspect` and `diff` stop with an error if Saleor returns the same page cursor twice, instead of requesting the same page forever.
