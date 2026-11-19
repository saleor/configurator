---
"@saleor/configurator": patch
---

`diff` and `deploy` no longer report changes for fields your config leaves out. A channel without `settings` or `taxConfiguration`, shop settings you don't list, and product or variant channel listings without dates, weight or cost price showed as updates on every deploy even though deploy leaves those values alone. A field you omit is now unmanaged, as a whole omitted section already was.
