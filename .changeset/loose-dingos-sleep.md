---
"@saleor/configurator": patch
---

Fixed warehouse email validation to handle optional emails from Saleor API. The configurator now correctly processes warehouses without email addresses during introspection and deployment. Empty email strings from the API are transformed to undefined values, preventing validation errors that previously blocked the introspect-deploy workflow.