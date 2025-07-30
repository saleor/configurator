---
"@saleor/configurator": patch
---

Fix introspect command creating invalid attribute definitions

The introspect command now properly generates attribute references for shared attributes. When an attribute is used across multiple product types or page types, it's automatically converted to reference syntax (e.g., `attribute: "Color"`) rather than duplicating the full definition. This prevents duplicate attribute errors during subsequent deployments.
