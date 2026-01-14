---
"@saleor/configurator": patch
---

Fix model update failing with "attributeIds" required error

- Include attributes directly in pageUpdate mutation instead of using separate pageAttributeAssign call
- Resolves deployment failures when updating models with attribute values
