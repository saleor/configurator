---
"@saleor/configurator": patch
---

`deploy` now updates existing product variants and their channel listings in batches via `productVariantBulkUpdate` (using the variants already fetched by `getProductsBySlugs` instead of querying each SKU one by one) and chunks `productVariantBulkCreate` using `SALEOR_PRODUCT_BATCH_SIZE` (default 25).
