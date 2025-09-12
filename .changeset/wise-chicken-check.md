---
"@saleor/configurator": minor
---

This release focuses on stability, clarity and scale across the whole flow (introspect → diff → deploy). It removes “nothing changed” updates, prevents product‑creation errors, makes previews more useful, and handles large catalogs reliably.

## New
- Safer product creation: the configurator now ensures required attribute values exist before creating products. This prevents occasional product‑creation failures when many products use the same new value.
- Richer create previews: product Creates now show product type, category, key attributes, and per‑variant channel prices.

## Improved
- Cleaner diffs: product descriptions are compared by visible text only, so diffs show meaningful content changes rather than raw JSON noise.
- Duplicate protection: if duplicate slugs/names are detected, deploy/diff is blocked with a clear, styled message and guidance on what to fix.

## Fixed
- Phantom updates removed: channel publish dates are normalized so format‑only differences no longer show as updates.
- Repeated “Create” suggestions eliminated: remote introspection now retrieves all products, not just the first page.

## Performance & Scale
- Large catalogs deploy more predictably with fewer redundant lookups and complete remote introspection.

## Notes
- No breaking changes.
- If deploy is blocked by duplicates, make the slugs/names unique in config.yml and rerun.
