---
"@saleor/configurator": patch
---

Added support for product channel listings and fixed entity identification issues

- Products and variants can now be configured with channel-specific pricing and visibility settings
- Fixed duplicate detection by using slugs as identifiers for categories, channels, and products instead of names
- Enables multi-channel commerce with per-channel product availability and pricing
