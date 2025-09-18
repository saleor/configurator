# TypeScript DSL Summary & Testing Guide

## Feature Overview

- **TS-first workflow**: `configurator init --ts` scaffolds a `config/` workspace with stack, env helpers, domain modules, and a smoke test. Introspection defaults to TypeScript with split sections.
- **New CLI commands**:
  - `configurator build` — compile stack to JSON (`--pretty`, `--out`, `--watch`).
  - `configurator preview` — diff with TS-friendly messaging (never writes remotely).
- `configurator convert` — YAML → TypeScript (single or split layout, placing modules in `config/sections/`).
  - `configurator init` — scaffolds TypeScript templates and tests.
- **Config storage**: `createConfigurationManager` auto-detects TS, respects `SALEOR_CONFIGURATOR_TS_LAYOUT` for split sections, and the manager can emit single-file or modular output.
- **DSL enhancements**:
  - Duplicate identifier detection for array sections.
  - Deterministic guard (blocks `Math.random`, `Date.now`, etc.).
  - Component helpers (`createMarketChannel`, `registerAttributes`, `registerProductTypes`, `registerProducts`, `registerWarehouses`, `registerShippingZones`, `registerPageTypes`).
- **Docs**: README updated for TS workflow; `docs/typescript-quickstart.md` provides a full quickstart.
- **Type generation**: `pnpm generate-dsl-types` refreshes `src/dsl/types.ts` (invoked in `prepublishOnly`).
- **Start command**: now suggests TS defaults, highlights `init --ts`, and lists the new commands post-introspect.

## What to Explore / Validate

1. **Scaffold & Introspect**
   - `pnpm dlx @saleor/configurator init --dir config --layout sections`
   - `pnpm dlx @saleor/configurator introspect --config config/stack.ts --url … --token …`
   - Inspect generated modules under `config/sections/`

2. **Inner-loop commands**
   - `pnpm dlx @saleor/configurator build --config config/stack.ts --watch`
   - `pnpm dlx @saleor/configurator preview --config config/stack.ts --url … --token …`

3. **Migration**
   - `pnpm dlx @saleor/configurator convert --from config.yml --to config/stack.ts --layout sections`
   - Confirm output modules (`channels.ts`, `catalog.ts`, etc.) are generated.

4. **Component helpers**
   - Use `@saleor/configurator/dsl/components` in a custom stack (loop over markets, register products/warehouses/shipping zones/page types).

5. **Watch & determinism**
   - Simulate a non-deterministic call (e.g., `Math.random()`) and ensure the runtime throws.
   - Modify a file under `config/` while `build --watch` runs and confirm it rebuilds.

6. **CI hooks**
   - Run `pnpm generate-dsl-types` and `pnpm build` to ensure scripts succeed.

7. **Docs & Start**
   - `pnpm dlx @saleor/configurator start` now recommends TS defaults—verify messaging and interactive flow.

8. **Full pipeline**
   - After editing TS config, run `pnpm dlx @saleor/configurator deploy --config config/stack.ts --url … --token …` to validate end-to-end.
