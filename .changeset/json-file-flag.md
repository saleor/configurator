---
"@saleor/configurator": minor
---

`introspect`, `validate`, `diff` and `deploy` accept `--json-file <path>`, which writes the JSON result to a file in any output mode. CI steps can keep human-readable output and still read the change counts and exit status.
