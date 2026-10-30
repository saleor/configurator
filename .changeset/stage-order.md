---
"@saleor/configurator": patch
---

Fix first-time deploys leaving collections empty and menu items without their page links. Collections and menus are now deployed after products and models, so the products and pages they reference already exist.
