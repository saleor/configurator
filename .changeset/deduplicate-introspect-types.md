---
"@saleor/configurator": patch
---

Deduplicate product types and page types during introspect

The Saleor GraphQL API occasionally returns duplicate product type and page type entries in paginated edges. The first occurrence contains real attributes; subsequent duplicates have empty attribute arrays. Previously these all passed through to `config.yml`, causing duplicate entries with missing data.

Introspect now deduplicates by name, keeping only the first occurrence (which has the real attributes) and logging a warning for each skipped duplicate. Verified against a live Saleor instance that returned 8 duplicate product type edges.
