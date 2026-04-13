# Version Compatibility Strategy

## Context (April 13, 2026)

Configurator was upgraded from Saleor GraphQL schema `3.20` to `3.23`.

During this work we confirmed:

- Some changes were introduced in Saleor across minors without bumping Configurator's schema baseline (example: PR #163 added `SINGLE_REFERENCE` support through targeted patches).
- `ShopSettingsInput` and `Shop` dropped legacy digital settings fields in `3.23`:
  - `automaticFulfillmentDigitalProducts`
  - `defaultDigitalMaxDownloads`
  - `defaultDigitalUrlValidDays`

## What This Means

Relying on one static schema version is not enough for real-world compatibility.

Users run mixed Saleor versions, so Configurator should be designed around capability differences between API schemas, not only one pinned minor.

## Working Rules

1. Keep a documented support window (for example: `min supported` and `latest tested`).
2. Prefer additive, capability-based patches over forcing every user to latest Saleor.
3. For removed/deprecated fields:
   - Do not break introspection/diff for latest Saleor.
   - Do not immediately remove support for older stores if safe fallback is possible.
4. Every compatibility patch must include:
   - tests for both success and fallback behavior
   - TODO note describing intended long-term replacement
   - changeset entry (patch/minor depending on user impact)

## Short-Term Shim Introduced

For shop settings updates, Configurator now applies a compatibility retry:

1. First attempt sends full input (including legacy digital fields if present).
2. If Saleor returns GraphQL "unknown field in `ShopSettingsInput`" for those legacy fields, Configurator retries once with those fields removed.
3. This keeps `3.23` working while preserving first-attempt behavior for older versions that still accept the fields.

This is a transitional shim, not the final architecture.

## Long-Term Plan

1. Add explicit capability detection (introspection or feature probes) and cache capabilities per instance.
2. Route read/write/diff behavior via a compatibility layer keyed by capabilities.
3. Add CI matrix tests against at least:
   - lowest supported Saleor minor
   - latest supported Saleor minor

## PR Checklist for Future Version Work

1. Compare old vs new schema diff and list affected entities/fields.
2. Classify each change:
   - additive (safe)
   - renamed/removed (breaking risk)
   - behavior change (runtime risk)
3. Decide path per change:
   - static upgrade
   - targeted patch
   - temporary shim + TODO
4. Verify `introspect`, `diff`, and `deploy` paths.
5. Document compatibility impact in PR body and changeset.
