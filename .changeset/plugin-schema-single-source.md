---
"@saleor/configurator": patch
---

Fix plugin/schema drift that was causing stale syntax guidance (`attributes`) while CLI validation expected `productAttributes`/`contentAttributes`.

- Add `schema:sync` and `schema:check` scripts and enforce them in PR CI, release CI, and `prepublishOnly`.
- Keep Zod schema as the single source of truth and regenerate `schema.json` deterministically.
- Remove duplicated `plugin/schemas/config.schema.json` snapshot to avoid schema forks.
- Update plugin validation to use CLI validation first (authoritative), with JSON schema fallback to canonical schema locations.
- Update plugin docs/templates/skills to stop pointing users to stale top-level `attributes` syntax.
