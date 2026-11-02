---
"@saleor/configurator": patch
---

`diff` and `deploy` no longer report every remote entity of a section as a deletion when that section is absent from your config. An absent section is now treated as unmanaged; an explicitly empty list (e.g. `channels: []`) still reports remote entities as missing from config. This also stops `--fail-on-delete` from blocking deploys of partial configs and recipes.
