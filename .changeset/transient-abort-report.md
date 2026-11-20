---
"@saleor/configurator": patch
---

When a deploy is stopped by a rate limit or network error that persists through retries, the stages that already ran are now shown in the deployment summary and the deployment report is still saved. Remaining stages are listed as not run. The error message and exit code are unchanged.
