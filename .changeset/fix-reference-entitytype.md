---
"@saleor/configurator": patch
---

Fixed REFERENCE attributes missing entityType during introspection

- Added `entityType` field to GraphQL queries for productAttributes, variantAttributes, and pageType attributes
- Added validation that throws clear errors when REFERENCE attributes are missing required entityType
- Improved error logging for attribute extraction failures
