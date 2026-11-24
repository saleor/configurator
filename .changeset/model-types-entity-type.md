---
"@saleor/configurator": patch
---

`diff`, the `deploy` preview, `introspect` and PR comments list model type changes under "Model Types"; they used to appear under "Page Types". In JSON output their `entityType` is now `"Model Types"`, and `--entity-type "Model Types"` selects them (`--entity-type "Page Types"` no longer does). Deploy runs the model types stage, not the page types stage, for a model type change.
