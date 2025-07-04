---
"saleor-configurator": minor
---

**What changed**: Renamed `push` command to `deploy` with enhanced safety features

Introduces a production-ready deployment experience with mandatory diff preview and smart confirmation workflows. The new deploy command provides transparency and safety for configuration changes.

**Key Features:**
- **Mandatory diff preview** - Shows exactly what will be created, updated, or deleted
- **Smart confirmations** - Different prompts for safe vs destructive operations  
- **Destructive operation warnings** - Explicit warnings when items will be permanently deleted
- **CI/CD ready** - `--ci` and `--force` flags for automated environments
- **Enhanced error handling** - Categorized errors with actionable recovery suggestions

**Migration Guide:**
- Replace `pnpm push` with `pnpm deploy`
- Package scripts updated from `push` to `deploy`
- New flags: `--ci`, `--force`, `--skip-diff`
