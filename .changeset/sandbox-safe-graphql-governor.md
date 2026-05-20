---
"@saleor/configurator": patch
---

Deployments now use sandbox-safe API pacing by default, reducing HTTP 429 failures when applying larger configurations to Saleor Cloud sandbox environments. Users deploying to faster unrestricted environments can still tune or disable the request governor with environment variables.
