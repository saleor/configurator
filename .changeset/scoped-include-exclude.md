---
"@saleor/configurator": patch
---

Make `--include` and `--exclude` consistently scope diff and deploy processing by top-level config section.

The flags now apply to `diff`, `deploy`, and `introspect` without changing the GraphQL introspection query. Excluded sections are not parsed, compared, or processed independently, and commands reject using include and exclude together.
