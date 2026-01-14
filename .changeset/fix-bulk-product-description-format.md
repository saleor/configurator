---
"@saleor/configurator": patch
---

Fix bulk product creation failing with JSON parsing error

Product descriptions in `bootstrapProductsBulk` were sent as plain text, but Saleor expects EditorJS JSON format. This caused the error: `"Expecting value: line 1 column 1 (char 0)"`.

- Add `wrapDescriptionAsEditorJS` helper to wrap plain text in EditorJS format
- Apply helper to bulk product create, bulk product update, and upsertProduct
- Add tests to prevent regression
