Title: Saleor Configurator – Deployment Stability, UX, and Scale Improvements (as of 2025‑09‑12)

Summary
- Goal: Stabilize config-as-code deploys (introspect → diff → deploy), remove phantom diffs, prevent attribute choice races, improve preview UX, and make product bootstrapping fast and deterministic.
- High impact fixes:
  - Duplicate detection: block deploy/diff with styled warnings and guidance.
  - Deploy preview/diff: show product attributes and variant prices on create; format improvements.
  - Description handling: no double-encoding; diff by visible text only.
  - Attribute choices preflight: create missing dropdown/multiselect/swatch values once, then cache.
  - Product-stage caching: attributes/choices, product type IDs, category IDs.
  - Datetime normalization: avoid publishedAt format-only updates.
  - Remote pagination: fetch all products to prevent repeated creates.

Context: what was happening
- Introspect/diff/deploy was failing or noisy due to:
  - Duplicate product slugs in config → diff exception.
  - Attribute choice races → sporadic IntegrityError from productCreate.
  - Create previews lacked attributes/variants → limited visibility.
  - Product descriptions stored as double-encoded JSON strings → dashboard looked wrong; diffs were unstable.
  - Second deploys showed phantom product updates (ISO datetime format drift).
  - Large catalogs: remote introspection queried only first 100 products → next deploys proposed repeated creates.

What we changed (code)
- Diff and UX
  - Product comparator: normalize product channel listing datetimes; compare description by plain text only.
  - Deploy and diff formatters: include product attributes and variant channel prices on create.
  - Duplicate handling: warn using CLI/chalk and block deploy/diff; no auto-dedup at comparator level.

- Attribute lifecycle and caching
  - New “Preparing attribute choices” stage (before Products):
    - Scans changed products’ attributes; adds missing values for DROPDOWN/MULTISELECT/SWATCH only.
    - Idempotent addValues using externalReference per value.
    - Re-fetches attributes and primes an in-memory cache used by the products stage.
  - AttributeResolver now reads from the cache first; avoids inline (.value) creation during products.
  - ProductService caches product type IDs and category IDs.

- Description stability
  - When creating/updating products: if description looks like JSON, pass through; else wrap as minimal EditorJS JSON.
  - During diffs: extract visible text from EditorJS blocks, decode entities, strip tags, normalize whitespace.

- Remote completeness
  - Full product pagination for introspection: fetch in pages of 100 and merge all edges before diff.
  - Fixes repeated “Create” suggestions for existing products.

- CLI experience
  - Styled duplicate report (chalk) with a clear “deployment/diff blocked” message and actionable guidance.
  - Errors are converted to Validation errors with suggestions instead of raw exceptions.

Files of note (not exhaustive)
- src/core/deployment/stages.ts: Added attributeChoicesPreflightStage and cache priming.
- src/core/diff/comparators/product-comparator.ts: Description text diff; datetime normalization; variant/channel normalization tweaks.
- src/core/diff/formatters/{deploy-formatter.ts,detailed-formatter.ts}: Create previews show attributes and variant prices.
- src/commands/{deploy.ts,diff.ts}: Friendly duplicate output and control flow.
- src/cli/reporters/duplicates.ts: New reporter for duplicate entities.
- src/core/validation/preflight.ts: Duplicate scanning and validation helper.
- src/core/service-container.ts: Exposed AttributeService; wired cache-aware resolvers.
- src/modules/product/{attribute-resolver.ts,product-service.ts}: Cache-aware lookups; description handling.
- src/modules/attribute/repository.ts: Include choice ids; richer metadata.
- src/modules/config/repository.ts: Full products pagination; avoid 100-item limit.

Behavioral changes validated
- Second deploys no longer propose updates for publishedAt format-only differences.
- Product descriptions render correctly in Saleor dashboard; diffs show only real text changes.
- Deploy no longer fails with duplicate slugs — instead shows a styled validation summary and exits cleanly.
- Attribute choice races removed; product creation proceeds deterministically.
- Large catalogs: repeated “Create” diffs for existing products are gone (complete remote set is fetched).

Current state
- Deploy and diff flows are stable and informative for channels, product types, categories, products, and attributes.
- Preflight stage ensures choice values exist, preventing runtime creation and races.
- Caches reduce API calls substantially during product bootstrapping.

Open issues / potential next additions
- Choices preflight UX: add a preview box with counts and per-attribute value lists before applying.
- Strict resolver mode (optional flag): fail fast if any required choice is still missing after preflight.
- Concurrency guard: cap product creation concurrency for very large catalogs to keep load predictable.
- Description preview on create: show a short snippet in deploy/diff create previews.
- Unit tests: add tests for the new preflight stage and caching behavior.
- Extend datetime normalization elsewhere (collections/models) for complete consistency.

Operational guidance
- If deploy is blocked by duplicates: edit config.yml to ensure unique slugs/names; re-run diff/deploy.
- If a new country/region/technology appears in products: preflight will add it and cache it automatically.
- For very large catalogs: first diff may take longer while the remote pagination fetches all products; subsequent deploys benefit from fewer changes and caching.

