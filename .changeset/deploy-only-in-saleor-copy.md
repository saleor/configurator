---
"@saleor/configurator": patch
---

The interactive `deploy` preview no longer says entities missing from your config will be deleted. Deploy never removes them: they're now listed as "Only in Saleor", left out of the change count, and no longer trigger the "cannot be undone" confirmation or show as deleted in the summary. JSON output and `--fail-on-delete` are unchanged.
