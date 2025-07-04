---
"saleor-configurator": minor
---

# Fixed introspect command showing changes backwards

## Main Fix

- **Fixed diff perspective bug**: Introspect was showing what would be pushed TO Saleor instead of what would happen to your local file when pulling FROM Saleor
- Now correctly shows what will be added, updated, or removed in your local configuration

## Additional Features

- **Selective options**: Use `--only` and `--exclude` to filter which configuration sections to process
- **CI mode**: Added `--ci` flag for non-interactive usage that exits with appropriate status codes
- **Output formats**: Support for `--format json|yaml|table` output

## Code Improvements

- Refactored into small, focused functions following clean coding principles
- Removed inline comments in favor of self-documenting code
- Extracted selective options logic into reusable utility functions

## Usage Examples

```bash
# Only update specific sections
configurator introspect --only channels,shop

# Exclude certain sections  
configurator introspect --exclude products

# CI mode (non-interactive)
configurator introspect --ci

# JSON output for scripts
configurator introspect --format json --quiet
```
