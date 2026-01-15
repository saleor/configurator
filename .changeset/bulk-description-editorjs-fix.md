---
"@saleor/configurator": patch
---

Fix bulk product operations not wrapping descriptions as EditorJS JSON

- Extract `wrapDescriptionAsEditorJS` method to consolidate description handling
- Fix `bootstrapProductsBulk` create path missing EditorJS wrapping
- Fix `bootstrapProductsBulk` update path missing EditorJS wrapping
- Add JSON.parse validation to catch invalid JSON-like strings (e.g., "{Contact us}")
- Log warning when description looks like JSON but fails to parse
- Add comprehensive tests for edge cases (empty, whitespace, invalid JSON)
