---
"saleor-configurator": minor
---

Improve attribute duplicate handling

Enhanced attribute handling to prevent duplicate definitions and encourage the use of reference syntax:

- Added `DuplicateAttributeDefinitionError` for better error messaging when attributes are defined multiple times
- Check for existing attributes globally before creating new ones
- Suggest using reference syntax (`attribute: "AttributeName"`) when attributes already exist elsewhere
- Allow full attribute input once, but encourage references for reuse

This prevents conflicts and promotes better configuration practices by encouraging attribute reuse through the reference syntax.