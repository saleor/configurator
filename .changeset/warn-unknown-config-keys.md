---
"@saleor/configurator": patch
---

Unknown config keys are now reported instead of silently ignored. `validate`, `diff`, `deploy` and `recipe` print a warning for each key the schema doesn't define, at any level of the file, for example `Unknown key "shop.headrText" is not supported and was ignored`. A key repeated across many entries is reported once with a count. The key is still ignored, so configs that worked before keep working; `validate --json` lists them under `result.warnings`. Unknown keys on channels and channel tax settings now warn too, instead of failing validation.

`introspect` no longer writes a `slug` on page types; the field was derived from the name and was never read.
