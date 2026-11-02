---
"@saleor/configurator": patch
---

Fix product diff reporting channel listings and variants in the wrong direction. A listing or variant that exists only in your config is now reported as "will be added" (it used to say "will be removed"), and one that exists only in Saleor is reported as "only in Saleor (deploy does not remove it)". Current and desired values in diff output are no longer swapped for these changes.
