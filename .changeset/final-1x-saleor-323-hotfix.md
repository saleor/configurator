---
"@saleor/configurator": patch
---

Restore compatibility with Saleor 3.23 by ignoring legacy digital shop settings removed from Saleor. Configurator 1.x still validates existing config files that contain `automaticFulfillmentDigitalProducts`, `defaultDigitalMaxDownloads`, and `defaultDigitalUrlValidDays`, but it no longer queries or sends those fields to Saleor.

This is the final 1.x compatibility update. Configurator 1.x supports Saleor versions only up to 3.23; Saleor 3.24+ and future minors require Configurator 2.x.
