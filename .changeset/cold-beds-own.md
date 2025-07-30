---
"@saleor/configurator": patch
---

Fix page type attribute comparison in diff command

Page type attributes were being ignored during diff operations due to inverted filtering logic. The comparator was incorrectly removing valid attributes instead of keeping them. This fix ensures page type attribute changes are properly detected and can be deployed.
