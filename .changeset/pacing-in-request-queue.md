---
"@saleor/configurator": patch
---

Request pacing now lives only in the request queue, set by the `GRAPHQL_*` environment variables. `introspect`, `diff` and `deploy` no longer add their own waits between requests.
