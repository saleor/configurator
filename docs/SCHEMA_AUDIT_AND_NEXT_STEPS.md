# Schema Audit & Next Steps

This document summarizes gaps and optimizations identified by comparing our implementation to the Saleor GraphQL schema (`src/lib/graphql/schema.graphql`) and to GreenProject’s current configuration. It also captures concrete next steps (code + tests) to close the gaps.

## Key Findings

1) Channel tax configuration (per‑channel) not applied
- Schema: `taxConfigurationUpdate(id, input)` and `TaxConfigurationUpdateInput` enable per‑channel tax settings (chargeTaxes, displayGrossPrices, pricesEnteredWithTax, taxCalculationStrategy, taxAppId).
- Status: We already have repository/service support (TaxRepository.updateTaxConfiguration, TaxService.updateChannelTaxConfiguration), but we do not map `config.channels[].taxConfiguration` into deploy logic.
- Effect: Channel tax settings from config are ignored → drift persists.
- Fix:
  - Map `config.channels[].taxConfiguration` in channels stage and call `TaxService.updateChannelTaxConfiguration(channelId, input)` after channel update.
  - Add diff coverage so changes appear in `diff` and `introspect`.

2) Shop settings coverage incomplete
- Schema: `ShopSettingsInput` includes many fields (trackInventoryByDefault, reserveStock*, defaultDigital*, defaultMailSender*, customerSetPasswordUrl, limitQuantityPerCheckout, enableAccountConfirmationByEmail, allowLoginWithoutConfirmation, displayGrossPrices, etc.).
- Status: `ShopRepository.updateShopSettings` submits only a subset (headerText, description, defaultWeightUnit, fulfillment flags, automaticFulfillmentDigitalProducts). The rest aren’t applied.
- Effect: Edits to those fields in `config.shop` won’t apply; recurring diffs.
- Fix:
  - Extend shop mapping to include all `ShopSettingsInput` fields we surface in config.
  - Add integration tests toggling each field and asserting no phantom diff after deploy.

3) Attribute references for PAGE not implemented
- Schema: attributes may be `REFERENCE` with `entityType` PAGE/PRODUCT/PRODUCT_VARIANT.
- Status: Product attributes resolve PRODUCT (by name) and VARIANT (by SKU). PAGE resolution is not wired; model/page REFERENCE isn’t implemented either.
- Effect: Page references in product attributes won’t resolve.
- Fix:
  - Inject a reference resolver (getPageBySlug) into `AttributeResolver` to support `entityType === "PAGE"`.
  - Extend `ModelAttributeResolver` similarly if needed.
  - Add targeted tests for product and model PAGE references.

4) Variant channel listings strictness
- Schema: variant channel listing input requires `price`; costPrice is optional.
- Status: Introspect filters out listings without a numeric price to satisfy our config schema requirement.
- Effect: If a listing has costPrice only, it disappears and appears as a change.
- Fix:
  - Make `price` optional in our config schema (variant channel listing). Preserve costPrice‑only listings and normalize diffs.

5) Variant name diffs (noise)
- Schema: variant name is not a reliable key; SKU is the unique identifier.
- Status: We diff `variant.name` values which can be normalized or opaque from the server.
- Effect: Cosmetic diffs.
- Fix:
  - Ignore `variant.name` in diff or normalize it during introspect to reduce noise.

6) Manual type drift vs. schema
- Schema: `AttributeValueInput` supports typed fields (dropdown, swatch, multiselect, numeric, boolean, date, dateTime, plainText, richText, file, references).
- Status: `src/lib/graphql/graphql-types.ts` differs from schema (legacy `values` usage, shapes). We adapted resolvers but some casts remain.
- Effect: Confusion/fragility in typing; potential future regressions.
- Fix:
  - Align local types with schema (or rely on `gql.tada` types). Remove redundant manual types where possible.

7) Product description update
- Schema: ProductInput.description is `JSONString`.
- Status: Implemented safe update & retry without description on error; aligns with schema.
- Note: Keep retry path as guard for stores with stricter formatting.

8) Category path verification
- Schema: categories expose parent chain; path validation is application logic.
- Status: Improved to verify parent chain for `parent/child` references.
- Note: No further schema actions required.

## Optimizations & Quality

- Diff normalization: Already applied for product (attribute arrays) and channel listings. Consider extending to other entities if noise appears.
- Introspect tolerant mode: Keeps flow smooth when local YAML is invalid.
- Model/Page typed attributes: Implemented typed payloads (dropdown, multiselect, boolean, numeric, date/datetime, richText, file). Add REFERENCE next.

## Next Steps (with files & tests)

1) Apply channel tax configuration
- Code:
  - `src/modules/config/config-service.ts`: ensure `channels[].taxConfiguration` maps from introspection.
  - `src/core/deployment/stages.ts` and/or `src/modules/channel/channel-service.ts`: after channel update, call `TaxService.updateChannelTaxConfiguration(channelId, mappedInput)`.
- Tests:
  - Set per‑channel displayGrossPrices/pricesEnteredWithTax in config → diff shows changes → deploy applies → introspect returns same (no changes next run).

2) Complete Shop settings mapping
- Code:
  - `src/modules/shop/shop-service.ts`, `src/modules/shop/repository.ts`: extend mapping to all fields in `ShopSettingsInput` we expose in `config.shop`.
- Tests:
  - Toggle each shop field in config → diff shows a single shop update → deploy applies → no diff next run.

3) Implement PAGE references resolution
- Code:
  - `src/modules/product/attribute-resolver.ts`: accept an injected `getPageBySlug` resolver; branch `entityType === 'PAGE'`.
  - `src/core/service-container.ts`: wire `ModelRepository.getPageBySlug` into AttributeResolver factory.
  - `src/modules/model/model-attribute-resolver.ts`: add REFERENCE support for PAGE (and optionally PRODUCT/VARIANT if used on pages).
- Tests:
  - Product attribute REFERENCE(PAGE) resolves by slug.
  - Model attribute REFERENCE(PAGE) resolves by slug.

4) Relax variant channel listing schema
- Code:
  - `src/modules/config/schema/schema.ts`: make `price` optional for variant channel listings.
  - `src/core/diff/comparators/product-comparator.ts`: preserve and normalize listings with only costPrice.
- Tests:
  - Introspect a product with costPrice‑only listings → round‑trip without change.

5) Reduce variant name diff noise
- Code:
  - `src/core/diff/comparators/product-comparator.ts`: skip comparing `variants.*.name` by default (or behind a flag).
- Tests:
  - Change variant names in local file only → no diff when SKUs and other data match.

6) Type alignment
- Code:
  - Remove/replace mismatched definitions in `src/lib/graphql/graphql-types.ts`; rely on `gql.tada` generated types wherever possible.
- Tests:
  - Typecheck ensures AttributeValueInput shapes match schema (typed dropdown/multiselect/swatch, etc.).

## Acceptance Criteria
- Per‑channel tax configuration deploys and round‑trips cleanly.
- All `shop` fields we expose deploy and stop appearing in diff after deploy.
- Product and model PAGE references resolve by slug.
- Variant costPrice‑only channel listings round‑trip without phantom diffs.
- Variant name changes alone do not cause diffs.
- Local types conform to schema; attribute resolvers don’t need `as any` casts for core fields.

## Risks & Mitigations
- Different Saleor versions: guard by feature detection (e.g., presence of fields in introspection); log graceful fallbacks.
- Strict environments: allow a “strict references” mode to fail on missing choices instead of creating by value.
- Shop vs channel tax overlap: document precedence and prefer per‑channel configuration in configs.

---

If you want, I can start with channel tax configuration and PAGE reference resolution; those are the highest leverage for GreenProject’s config fidelity.
