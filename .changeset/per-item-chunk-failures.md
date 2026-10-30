---
"@saleor/configurator": patch
---

Fix deploy reports blaming the wrong entities. When one product type, warehouse, collection or customer type failed, every other entity processed in the same batch of 10 was also reported as failed, even though it had been saved. Failures are now reported per entity.
