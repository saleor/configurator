---
"@saleor/configurator": patch
---

Merge category introspection with attribute normalization

Combined the category introspection feature (Bug #8) with the attribute reference normalization feature (Bug #4). The configuration service now properly maps categories from remote Saleor instances while also preventing duplicate attribute definition errors during deployment.
