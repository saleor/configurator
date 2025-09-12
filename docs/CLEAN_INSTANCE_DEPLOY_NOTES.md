# Clean Instance Deploy – Notes & Tracking

This file tracks issues observed when deploying to a brand‑new Saleor instance and documents fixes, rationale, and verification steps.

## Summary (Before → Now)

- Shipping Zones
  - Before: Creating a shipping zone that referenced `warehouses` and `channels` failed with:
    - `[addWarehouses] Only warehouses that have common channel with shipping zone can be assigned.`
  - Root cause: Saleor requires every warehouse assigned to a zone to also be assigned to each channel in that zone.
  - Now: Before creating/updating a zone, we pre‑assign its warehouses to all zone channels via `channelUpdate(addWarehouses: [warehouseIds])`.

- Product/Variant Channel Listings
  - Before: On a fresh environment, updating product or variant channel listings sometimes logged:
    - `Channel "<slug>" not found.`
  - Root cause: Immediately after channel creation, the channel list query may not reflect new channels in some environments. We tolerate this and proceed.
  - Now: Channels are created first; if listings can’t resolve in the same run, a second `--include=products` deploy typically applies the updates cleanly.

- Attribute Choice Creation (expected on clean instances)
  - Warnings like `Choice "Netherlands" not found … will use value-based resolution` are expected. We resolve by value and let Saleor create missing choices.

## Code Changes Implemented

- Shipping Zone Preconditions
  - File: `src/modules/shipping-zone/shipping-zone-service.ts`
  - What: Before `createShippingZone`/`updateShippingZone`, if both `warehouses` and `channels` are provided:
    - Resolve their IDs, then for each channel call `channelUpdate` with `addWarehouses: [warehouseIds]`.
    - Proceed with zone creation/update and shipping methods.

- PAGE References for Product Attributes
  - Files: `src/modules/product/attribute-resolver.ts`, `src/modules/product/product-service.ts`, `src/core/service-container.ts`
  - What: Added injected page lookup resolver to support `REFERENCE(entityType=PAGE)` by page slug.

- Per‑Channel Tax Configuration (Deploy)
  - File: `src/core/deployment/stages.ts`
  - What: After channels bootstrap, apply `channels[].taxConfiguration` via `TaxService.updateChannelTaxConfiguration` if present.

- Variant Channel Listing Schema
  - File: `src/modules/config/schema/schema.ts`
  - What: Made `price` optional to allow costPrice‑only listings and avoid phantom diffs.

- Diff Noise Reduction
  - File: `src/core/diff/comparators/product-comparator.ts`
  - What: Skip comparing `variant.name`.

## How to Verify on a Clean Instance

1) Channels and Shipping Zones
- Command:
  - `pnpm dev deploy --url=https://<store>.saleor.cloud/graphql/ --token=<token> --include=channels,warehouses,shippingZones`
- Expect:
  - Channels created
  - Warehouses created/updated
  - Shipping zone created without the `[addWarehouses] … common channel …` error

2) Products & Variants
- Command:
  - `pnpm dev deploy --url=… --token=… --include=products`
- Expect:
  - Products/variants created
  - If you see `Channel "…" not found` warnings, immediately re‑run:
    - `pnpm dev deploy --url=… --token=… --include=products`
  - On the second pass, channel listings typically apply cleanly.

3) Attributes & Choices
- Edits to MULTISELECT/DROPDOWN deploy without schema errors.
- Missing choices are created by value (warnings are informational only).

4) Idempotency
- `pnpm dev diff --url=… --token=…` → no or minimal differences after the above.
- Optional: `pnpm dev introspect` to confirm round‑trip.

## Future Improvements (Optional)
- Channel list query immediacy: We could cache created channel IDs within the pipeline and prefer that cache over a fresh channel query when updating product/variant channel listings in the same run.
- Add introspection mapping for `channels[].taxConfiguration` so it appears in the YAML immediately after introspect.
- Extend PAGE reference resolution to model/page attributes (REFERENCE on pages) if needed in your content model.

## Related Docs
- `docs/GREENPROJECT_TEST_GUIDE.md` — hands‑on edits and commands to validate behavior.
- `docs/SCHEMA_AUDIT_AND_NEXT_STEPS.md` — schema gap analysis and roadmap.
