# Critical Gaps and Implementation Plan

This document summarizes the remaining gaps between our YAML config schema and the current implementation, and outlines a concrete plan to deliver a seamless workflow: introspect → edit → diff → deploy.

## Goals
- Zero “phantom” diffs after two consecutive introspects.
- Edits in `config.yml` deploy reliably across all covered entities and field types.
- Clear error surfaces and helpful messages when conflict or validation occurs.

---

## Critical Gaps (Must-Fix)

1) Shop settings: incomplete update coverage
- Why it matters: Edits in `shop:` don’t fully apply, causing repeated diffs or ignored changes.
- Current: `ShopRepository.updateShopSettings` mutation covers a small subset (headerText, description, defaultWeightUnit, fulfillment flags). Our config supports additional fields: displayGrossPrices, allowLoginWithoutConfirmation, trackInventoryByDefault, reserveStock* and defaultDigital*, limitQuantityPerCheckout, defaultMailSender*, etc.
- Plan:
  - Map all supported fields from `config.shop` → corresponding GraphQL mutations/inputs.
  - If Saleor requires multiple mutations, add a small orchestrator to apply them idempotently.
  - Extend diff/comparator if needed so it reflects only applicable fields.

2) Model/Page attributes: typed payloads missing
- Why it matters: Editing DROPDOWN/MULTISELECT/SWATCH/NUMERIC/DATE_TIME/RICH_TEXT/FILE attributes on models won’t deploy correctly.
- Current: `ModelService.updateModelAttributes` sends simple `values/boolean/date`, not typed fields.
- Plan:
  - Introduce `ModelAttributeResolver` mirroring `AttributeResolver` (products), returning typed `AttributeValueInput` (dropdown/swatch/multiselect/numeric/boolean/date/dateTime/plainText/richText/file/references).
  - Use page type metadata to validate and map choices similar to products.

3) Reference attributes: limited resolution
- Why it matters: Product attribute type REFERENCE may target PAGE or PRODUCT_VARIANT (not only PRODUCT).
- Current: `AttributeResolver` resolves referenced PRODUCT by name only; PAGE and PRODUCT_VARIANT not supported.
- Plan:
  - Extend resolver to branch by `attribute.entityType` and resolve by:
    - PRODUCT → by product name (existing) and/or slug.
    - PAGE → by page slug.
    - PRODUCT_VARIANT → by SKU.
  - Add helpful warnings and recovery suggestions when targets don’t exist.

4) Channel activation flag (`isActive`)
- Why it matters: Activation state is part of real store state; edits need to be round-trippable and deployable.
- Current: Introspect writes `isActive: false` for all channels. Channel queries/mutations don’t include/isActive consistently; service ignores it on updates.
- Plan:
  - Add `isActive` to channels query in `ConfigurationRepository` and map it in `config-service`.
  - Update `ChannelService`/`ChannelRepository` to set/read `isActive` on create and update (use `channelUpdate` input supports).
  - Normalize diff to prevent redundant toggles.

5) Attribute diff stability
- Why it matters: Multi-value attribute reordering appears as updates.
- Current: Product comparator compares attribute objects using `JSON.stringify` (order‑sensitive).
- Plan:
  - Normalize attribute values (sort arrays, drop undefineds) before comparison in `ProductComparator`.
  - Apply the same to model attribute diffs when adding typed updates.

6) Category path verification
- Why it matters: For inputs like `parent/child`, duplicate child slugs could resolve incorrectly.
- Current: Resolves only by final slug; no parent chain verification.
- Plan:
  - Add hierarchical check: verify that resolved child’s ancestry matches the given path; error/warn otherwise.

---

## High-Value Improvements (Nice-to-Have)

- Product description updates
  - Currently disabled due to server quirks. Optionally add a guarded flag to enable description update with safe JSON formatting.

- Variant name diffs
  - Some stores return variant names that look like global IDs; consider ignoring `variant.name` in diffs, or normalize during introspect to reduce noise.

- Generated types alignment
  - `src/lib/graphql/graphql-types.ts` partially diverges from the actual schema. Either regenerate or rely on `gql.tada` types to avoid future drift.

---

## Implementation Plan (Phased)

Phase 1 — Deployment correctness
1. Model/Page typed attributes
   - Add `ModelAttributeResolver` (structure mirrors `AttributeResolver`).
   - Update `ModelService.updateModelAttributes` to use typed payloads and choice resolution.
   - Tests: simple page type with DROPDOWN, MULTISELECT, BOOLEAN, DATE; verify deploy success.

2. Attribute diff normalization (products)
   - Normalize product attribute values before comparison.
   - Tests: reorder a multiselect in config → no diff.

Phase 2 — Parity and state fidelity
3. Channel `isActive`
   - Update GraphQL queries/mutations to include/set `isActive`.
   - Map in `config-service` + `ChannelService` create/update.
   - Tests: toggle `isActive` in config → diff and deploy reflect state.

4. Reference attributes (PAGE, PRODUCT_VARIANT)
   - Extend resolver: PAGE by slug, VARIANT by SKU; configurable fallback search.
   - Tests: attribute references deploy and diff cleanly.

Phase 3 — Shop settings full coverage
5. Shop settings orchestration
   - Inventory, login, confirmation, email defaults, reserve stock, digital defaults, quantity limits, pricing display.
   - If multiple mutations are needed, sequence them idempotently.
   - Tests: tweak each field in `shop:` and verify no phantom diff after deploy.

Phase 4 — Hardening & UX
6. Category path verification
   - Validate parent chain when path contains `/`; provide actionable error.

7. Optional toggles
   - Product description update flag.
   - Variant name comparison policy (ignore or normalize).

---

## Acceptance Criteria
- Two consecutive introspects produce “No changes” (idempotent round‑trip).
- Editing any supported attribute type on product/variant/model deploys successfully.
- Channel activation round‑trips and deploys correctly.
- Shop settings changes apply and stop appearing in diff after deploy.
- Attribute order changes (arrays) do not create diffs.

## Risks & Mitigations
- Saleor API differences across versions → gate by schema checks; add graceful fallbacks.
- Creating new attribute choices by value may be undesirable in some environments → add a strict mode to fail instead of create.
- Shop settings may require multiple mutations → encapsulate orchestration with clear logs and partial failure handling.

## Tracking
- Create issues per phase item; link commits to items above.
- Add a short entry to CHANGELOG after each phase completes.

