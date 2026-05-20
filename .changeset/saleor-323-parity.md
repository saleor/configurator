---
"@saleor/configurator": major
---

Align configurator compatibility with Saleor 3.23.x and establish the new support contract for configurator 3.23.0.

Configurator versions now follow the supported Saleor major and minor declared in `package.json#saleor.schemaVersion`. Configurator 3.23.x targets Saleor 3.23.x; fixes within that support line ship as configurator patch releases. Older Saleor minors are no longer active support targets for the latest configurator line, and Saleor 3.23 compatibility is not backported to configurator 1.x.

Included in this release:

- Refresh GraphQL schema/types to Saleor 3.23.
- Remove GraphQL usage of shop settings removed in Saleor 3.23.
- Reject removed digital product shop settings in `config.yml` with migration-focused validation messages.
- Add support for `shop.useLegacyShippingZoneStockAvailability`.
- Add support for `CATEGORY` and `COLLECTION` reference attribute entity types.
- Warn, without failing, when remote Saleor minor differs from the supported minor.
- Publish the supported Saleor minor in generated schema artifacts.
