---
"@saleor/configurator": patch
---

Fix channel isActive field not being tracked in diff comparison

The diff command was not detecting changes to the `isActive` field on channels, causing deployment issues when trying to enable or disable channels. This field is now properly tracked and compared.
