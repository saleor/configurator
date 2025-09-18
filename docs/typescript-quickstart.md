# TypeScript Quickstart

This guide walks through the recommended TypeScript-first workflow for Saleor Configurator.

## 1. Scaffold a stack

```bash
pnpm dlx @saleor/configurator init --dir config --layout sections
```

The command creates a `config/` workspace with:

- `stack.ts` — the root entrypoint
- `env.ts` — environment helpers
- Domain modules under `config/sections/` (`shop.ts`, `channels.ts`, `catalog.ts`, `fulfillment.ts`, `content.ts`)
- `__tests__/config.spec.ts` — a smoke test invoking `configurator build`

## 2. Pull your current store state

```bash
pnpm dlx @saleor/configurator introspect \
  --url https://your-store.saleor.cloud/graphql/ \
  --token $SALEOR_TOKEN \
  --config config/stack.ts
```

The CLI writes TypeScript modules for every populated section, preserving the split layout.

## 3. Iterate with code

- Use loops to generate repeatable structures (channels per market, shipping zones per region).
- Extract reusable helpers inside `config/lib/` (see `@saleor/configurator/dsl/components`).
- Prefer `createMarketChannel`, `registerAttributes`, and other helpers to reduce boilerplate.

Example snippet:

```ts
import { defineStack } from "@saleor/configurator/dsl";
import { createMarketChannel, registerProductTypes } from "@saleor/configurator/dsl/components";
import { markets } from "./env";

export default defineStack("staging", () => {
  markets.forEach((market) => {
    createMarketChannel({
      name: market.name,
      slug: market.slug,
      currencyCode: market.currencyCode,
      defaultCountry: market.defaultCountry,
    });
  });

  registerProductTypes([
    {
      name: "Book",
      isShippingRequired: true,
      productAttributes: [{ name: "Author", inputType: "PLAIN_TEXT" }],
    },
  ]);
});
```

## 4. Validate locally

```bash
pnpm dlx @saleor/configurator build --config config/stack.ts --pretty
pnpm dlx @saleor/configurator build --config config/stack.ts --watch
pnpm dlx @saleor/configurator preview --config config/stack.ts --url ... --token ...
```

The `build` command compiles your stack and surfaces schema validation errors. `preview` mirrors `diff` but adds TypeScript-first messaging and never mutates remote data.

## 5. Deploy with confidence

```bash
pnpm dlx @saleor/configurator deploy --config config/stack.ts --url ... --token ...
```

If you ever need to migrate from YAML, use:

```bash
pnpm dlx @saleor/configurator convert --from config.yml --to config/stack.ts --layout sections
```

## 6. Keep it deterministic

The DSL guards against non-deterministic constructs (e.g., `Math.random`, `new Date()`). Stick to pure functions and configuration data to guarantee reproducible builds.

## Helpful references

- `pnpm dlx @saleor/configurator --help`
- `docs/typescript-dsl-plan.md` for roadmap details
- `schema.json` / `SCHEMA.md` for field-level reference
