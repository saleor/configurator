---
"@saleor/configurator": patch
---

Set up plugin distribution for Claude Code marketplace and directory submission

- Enrich root `.claude-plugin/marketplace.json` with `$schema`, `metadata` (version, homepage), plugin `category`, and `keywords` for marketplace discovery
- Fix README install instructions: replace deprecated `/install-plugin` with current `/plugin marketplace add` and `/plugin install` syntax
- Add "From Official Directory" install section for post-approval directory installs
