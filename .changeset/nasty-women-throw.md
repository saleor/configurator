---
"@saleor/configurator": minor
---

Add complete product management with variants and channel listings support.

Products can now be fully managed through YAML configuration including variants, attributes, and multi-channel pricing. The implementation includes deep field-level comparison for accurate diff detection, idempotent deployment using slug-based identification, and proper handling of product dependencies in the deployment pipeline. 

Fixed channel listings format to use arrays instead of objects for schema compliance, and resolved REFERENCE attribute validation errors by providing sensible defaults.
