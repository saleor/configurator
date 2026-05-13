---
"@saleor/configurator": major
---

Support only the latest Saleor minor version. This release targets Saleor 3.23 and updates the bundled GraphQL schema accordingly.

Remove legacy digital product shop settings that were removed from Saleor 3.23:

- `automaticFulfillmentDigitalProducts`
- `defaultDigitalMaxDownloads`
- `defaultDigitalUrlValidDays`

These fields are no longer part of the Configurator schema and will no longer be queried, diffed, introspected, or deployed.
