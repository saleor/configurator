---
"@saleor/configurator": patch
---

Fixed channel creation for Balkan countries by adding missing currency codes to validation schema

- Added support for BAM (Bosnia and Herzegovina Convertible Mark), HRK (Croatian Kuna), and RSD (Serbian Dinar)
- Channels for Croatia, Slovenia, Bosnia and Herzegovina, and Serbia can now be created successfully
- Issue was caused by overly restrictive currency validation that didn't match Saleor's actual capabilities
