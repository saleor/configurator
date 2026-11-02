---
"@saleor/configurator": patch
---

`introspect` no longer writes every page type twice (under both `pageTypes` and `modelTypes`). Page types are written once, under `pageTypes`. If your config file already has a `modelTypes` section, or you ask for it with `--include=modelTypes`, it is still written as before.
