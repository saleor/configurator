---
"@saleor/configurator": patch
---

Fixed recursive subcategory support to handle unlimited hierarchy depths. Previously, introspection would flatten category hierarchies, and deployment only supported single-level nesting. Now categories maintain their full tree structure during introspection, deployment, and diff operations, enabling proper round-trip integrity for complex category hierarchies.
