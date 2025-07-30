---
"@saleor/configurator": patch
---

Fix category parent-child relationship detection in diff

Category comparisons now properly detect changes in nested subcategory structures. The diff command will show parent context for subcategory changes (e.g., 'In "Laptops": Subcategory "Gaming Laptops" added'), making it clear where in the hierarchy changes occurred. Previously, only top-level category changes were detected.
