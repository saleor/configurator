---
"@saleor/configurator": minor
---

Refactor Claude Code plugin to v2.1.0 with streamlined commands and intelligent debugging

**Commands consolidated from 8 to 6 focused commands:**
- `/configurator` - Core operations (init, validate, edit, review) in a single entry point
- `/configurator-fix` - New intelligent debugging with auto-fix and plain language explanations
- `/recipe` - Quick start with pre-built store recipes (fashion, electronics, food, subscription)
- `/discover` - Generate config from existing website via chrome-devtools or Saleor introspection
- `/configurator-model` - Interactive product modeling wizard (unchanged)
- `/configurator-import` - Data import from CSV, Excel, or Shopify (unchanged)

**Removed commands:** `/configurator-workflow`, `/configurator-setup`, `/configurator-init`, `/configurator-edit`, `/configurator-validate`, `/configurator-review`

**Agent changes:**
- Renamed `discover` agent to `store-analyzer` for clarity
- Updated agent descriptions and cross-references

**Skill improvements:**
- Added cross-references between related skills
- Improved frontmatter descriptions for better discoverability

**Other changes:**
- Removed hooks system (hooks.json, session-context.sh) in favor of simpler approach
- Added CHANGELOG.md and LICENSE
- Updated README with new command structure and getting-started workflows
