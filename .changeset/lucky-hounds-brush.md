---
"@saleor/configurator": minor
---

Added support for customer types, introduced in Saleor 3.23.

Two new configuration sections are available:

- `customerAttributes` — global attributes of Saleor type `CUSTOMER_TYPE`, alongside the existing `productAttributes` and `contentAttributes`.
- `customerTypes` — customer type definitions, identified by `slug`, with an optional `isDefault` flag and attribute references pointing at `customerAttributes`.

```yaml
customerAttributes:
  - name: Loyalty Tier
    inputType: DROPDOWN
    values:
      - name: Gold
      - name: Silver

customerTypes:
  - name: Retail
    slug: retail
    isDefault: true
    attributes:
      - attribute: Loyalty Tier
```

Both sections work with `introspect`, `deploy`, `diff` and the `--include`/`--exclude` selectors. Only one customer type may declare `isDefault: true`; more than one is rejected during preflight validation.

Reading customer types requires the `MANAGE_CUSTOMER_TYPES_AND_ATTRIBUTES` permission. Tokens without it keep working: the section is skipped during introspect with a warning instead of failing the whole run.
