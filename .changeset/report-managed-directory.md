---
"@saleor/configurator": minor
---

Move deployment reports to managed `.configurator/reports/` directory with auto-pruning

- Reports now saved to `.configurator/reports/` instead of the project root
- Auto-prunes to keep only the last 5 reports in the managed directory
- `--report-path` escape hatch preserved for custom paths (no pruning applied)
- Cleans up deploy command: removes inline comments, fixes type safety, extracts helper methods
