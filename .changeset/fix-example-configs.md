---
"@saleor/configurator": patch
---

The bundled example configurations (`example.yml`, `recipes/`, and the plugin's recipe templates) now pass validation and deploy checks: attributes are declared in `productAttributes`/`contentAttributes` and referenced by name, and fields Saleor doesn't support were removed.
