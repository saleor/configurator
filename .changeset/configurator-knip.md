---
"@saleor/configurator": patch
---

Add a standalone `pnpm knip` audit for unused code and dependencies, following the Saleor monorepo's pinned Knip version and typed configuration. Scope the audit to source and maintenance scripts, excluding generated GraphQL declarations and specification contracts.

Remove unused source files, formatter and test scaffolding, redundant exports, unused types and error classes, and seven unused development dependencies. Keep declarations used within their own module private.
