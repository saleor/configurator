---
"@saleor/configurator": patch
---

Expose Configurator as an in-process library through `createConfigurator` from `@saleor/configurator`. Applications can validate, introspect, diff, and deploy using configuration objects or YAML file paths, with generated TypeScript declarations, typed failures, and silent library operations. The existing CLI remains available.

Preserve existing addressless warehouses and plain-text attribute values when round-tripping introspected configuration.
