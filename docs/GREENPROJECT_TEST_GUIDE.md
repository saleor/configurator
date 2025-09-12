# GreenProject – Change Summary & Test Guide

This guide explains what was fixed and how to verify the changes end‑to‑end using your current GreenProject configuration (config.yml). It focuses on safe, high‑value checks you can do immediately.

## TL;DR — What’s Fixed
- Product/Variant attributes deploy correctly for all key types: DROPDOWN, MULTISELECT, SWATCH, NUMERIC, BOOLEAN, DATE, DATE_TIME, RICH_TEXT, FILE, and REFERENCE (PRODUCT, PRODUCT_VARIANT).
- Product attribute diffs are stable (array order changes don’t create phantom updates).
- Variant SKUs always round‑trip as strings (no schema errors on repeat introspect/diff).
- Channel activation state (`isActive`) round‑trips and can be deployed.
- Category paths like `parent/child` are validated against real hierarchy.
- Product description updates are supported (plain text is wrapped to JSONString); if the server rejects description JSON, we retry without it so other fields still update.

## How to Run
- Introspect: `pnpm dev introspect --url=https://<your-store>.saleor.cloud/graphql/ --token=<token>`
- Diff: `pnpm dev diff --url=… --token=…`
- Deploy: `pnpm dev deploy --url=… --token=…`

Use `--include=<section>` to scope deploys (e.g., `--include=products`, `--include=channels`).

---

## 1) Sanity Round‑Trip (No Changes After Second Introspect)
Goal: Confirm idempotency (no drift after fresh pull).

1. Run: `pnpm dev introspect --url=… --token=…` → Confirm overwrite.
2. Run again: `pnpm dev introspect --url=… --token=…` → Expect: “No changes”.

Why: Verifies SKU fix, stable comparisons, and clean YAML.

---

## 2) Update MULTISELECT Attribute (Technology)
Applies to your EAC products (e.g., “UK rego non-biomass compliance 2023” — slug `uk-rego-non-biomass-compliance-2023`).

Before (excerpt):
```yaml
products:
  - name: UK rego non-biomass compliance 2023
    slug: uk-rego-non-biomass-compliance-2023
    productType: Environmental Attribute Certificates (EACs)
    category: i-rec
    attributes:
      Technology: Renewable
```
After (set a new value):
```yaml
    attributes:
      Technology: Solar
```

Test:
- `pnpm dev diff --url=… --token=…` → should show 1 product update.
- `pnpm dev deploy --url=… --token=… --include=products` → should succeed without “Attribute expects a value…” errors.

Why: Confirms typed payload mapping for MULTISELECT.

---

## 3) Attribute Array Reorder Produces No Diff
You can also represent the MULTISELECT as an array and reorder it.

Before:
```yaml
    attributes:
      Technology: [Solar, Wind]
```
After (reorder only):
```yaml
    attributes:
      Technology: [Wind, Solar]
```

Test:
- `pnpm dev diff --url=… --token=…` → expect 0 differences for that product.

Why: Confirms normalized comparison for attribute arrays.

---

## 4) Toggle Channel Activation (isActive)
Your channels include:
- `act50 Product Portfolio` (slug `act-product-portfolio-channel`, currently `isActive: false`)
- `Test Euro Channel` (slug `test-euro-channel`, currently `isActive: false`)

Change (example):
```yaml
channels:
  - name: act50 Product Portfolio
    slug: act-product-portfolio-channel
    isActive: true
    # …keep the rest unchanged
```

Test:
- `pnpm dev diff --url=… --token=…` → should show channel update.
- `pnpm dev deploy --url=… --token=… --include=channels` → should apply the activation.
- Run introspect → channel should round‑trip with `isActive: true`.

Why: Verifies that channel activation is now mapped and deployable.

---

## 5) Product Description Update (Safe JSON Handling)
Pick a product (e.g., “US Wind V23” — slug `us-wind-v23`).

A) Update using plain text (we’ll wrap it as JSONString during update):
```yaml
products:
  - name: US Wind V23
    slug: us-wind-v23
    # …
    description: "Updated description for US Wind V23"
```

B) Or provide full EditorJS JSON string (will pass through as-is):
```yaml
    description: '{"time": 1755769741070, "blocks": [{"id": "nTcFoseD_K", "data": {"text": "Revised US Wind V23"}, "type": "paragraph"}], "version": "2.30.7"}'
```

Test:
- `pnpm dev diff --url=… --token=…` → shows product update.
- `pnpm dev deploy --url=… --token=… --include=products` → applies. If the API rejects the description JSON, the update is retried without description and still succeeds.

Why: Confirms safe description update behavior and fallback.

---

## 6) Variant SKUs Present After Introspect
After your first introspect, verify that every variant has `sku` written (we add a string fallback if remote SKU is missing).

Test:
- Run `pnpm dev introspect` → open `config.yml` and check `products[].variants[].sku` are present.
- Run `pnpm dev diff` → expect no schema errors and, after no edits, 0 differences.

Why: Confirms SKU round‑trip fix prevents schema validation failures.

---

## Optional — Nested Category Path Validation
If you create nested categories and reference a product category by path (e.g., `parent/child`), the parent chain must match the actual hierarchy.

Test (only if you have nested categories):
- Reference a product’s `category` as `parent-slug/child-slug`.
- Deploy → if the chain is wrong, you’ll get a clear warning; if correct, it resolves.

---

## Expected Outcomes
- Two consecutive introspects → “No changes”.
- Attribute edits (e.g., Technology) → deploy cleanly.
- Attribute array reorders → no diff.
- Channel activation → deploy and round‑trip.
- Product description → updated or gracefully skipped if API rejects JSON.
- Variant SKUs → present; no schema errors.

If anything behaves differently on your store, share the product/channel/attribute you tested and the diff/deploy output — I can tighten the comparator or resolvers further.
