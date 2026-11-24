---
"@saleor/configurator": patch
---

`deploy` now applies changes to channels configured without `settings`, such as a new name, default country or active state. Previously these channels were left unchanged while `deploy` reported success.
