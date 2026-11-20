---
"@saleor/configurator": patch
---

`recipe` commands work in the installed CLI again. They failed with "Failed to load recipe manifest" because the bundled CLI looked for its recipes outside the package.
