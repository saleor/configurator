---
"@saleor/configurator": patch
---

`deploy` now creates new products in fixed batches of 25 (overridable with `SALEOR_PRODUCT_BATCH_SIZE`) instead of sending all new products in a single `productBulkCreate` request. When a batch hits a 504 or network error, `deploy` polls Saleor by slug before resending only missing products once, continues with remaining batches, logs per-batch progress and duration, and notes that re-running `deploy` is safe.
