---
"@saleor/configurator": patch
---

`introspect --include/--exclude` no longer overwrites the whole config file with just the selected sections. Selected sections now replace their counterparts in the existing file and every other section is kept. If the existing file is invalid, selective introspect stops with an error instead of overwriting it.
