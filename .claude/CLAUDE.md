# Saleor Configurator

CLI that keeps a Saleor store in sync with a YAML file (`config.yml`): `introspect` writes the store to YAML, `diff` compares, `deploy` applies the YAML. The same engine is published as a library (`docs/library.md`).

## Running the CLI

`pnpm dev <command>` runs the CLI from source. It loads `SALEOR_URL` and `SALEOR_TOKEN` from `.env.local` (template: `.env.example`), so `--url` and `--token` are optional.

When stdin or stdout is not a TTY (agent shells, pipes, CI), prompts are skipped and commands print a JSON envelope. Pass `--text` for human-readable output.

## Before pushing

CI (`.github/workflows/qa.yml`) runs these; run them locally first:

```bash
pnpm schema:check   # schema.json must match the Zod config schema; run `pnpm schema:sync` after schema changes
pnpm check:ci       # Biome lint; `pnpm check:fix` fixes formatting and most lint
pnpm knip           # unused files, dependencies and exports fail CI
pnpm test:ci        # plain `pnpm test` starts Vitest in watch mode
pnpm typecheck      # not in CI
```

The `pre-push` hook regenerates `SCHEMA.md`; commit it when it changes. Every PR needs a changeset (`pnpm changeset`). A PR that changes only docs or tooling can carry the `skip changeset` label instead; CI rejects the label when `src/`, `schema.json`, `SCHEMA.md`, the lockfile or dependencies change.

## Checking against a real store

For changes to introspect, diff or deploy, run the round trip against a Saleor sandbox:

```bash
rm -f config.yml && pnpm dev introspect
# edit config.yml
pnpm dev deploy
pnpm dev deploy   # must report no changes
rm config.yml && pnpm dev introspect
pnpm dev diff     # must report no differences
```

The `verify-configurator` skill runs this round trip and the other commands against the shared sandbox and checks each result with a separate GraphQL read; use it to prove a change before a PR.

`deploy` saves a report to `.configurator/reports/deploy/<store>_<timestamp>.json`. `LOG_LEVEL=debug` turns on verbose logging. Requests are paced to stay under the sandbox limit of 120 requests per minute, so large deploys are slow by design; the pacing variables are in `docs/LIMITS.md`.

## Code

- `src/commands`: one file per CLI command. `src/core`: diff engine and deployment pipeline. `src/modules/<entity>`: service, repository and GraphQL operations per entity. `src/modules/config/schema`: the Zod config schema, source of `schema.json` and `SCHEMA.md`. `src/lib`: GraphQL client, errors, logger.
- Entities are matched between YAML and Saleor by one identifier each:

  | Identifier | Sections |
  |---|---|
  | `slug` | `channels`, `warehouses`, `categories`, `collections`, `products`, `menus`, `models`, `customerTypes` |
  | `name` | `productAttributes`, `contentAttributes`, `customerAttributes`, `productTypes`, `pageTypes`, `modelTypes`, `taxClasses`, `shippingZones` |
  | none (singleton) | `shop` |

- GraphQL operations are typed with gql.tada against `src/lib/graphql/schema.graphql`. `pnpm fetch-schema` refreshes the schema; `pnpm exec gql.tada generate-output` then regenerates `graphql-env.d.ts`.
- Errors extend `BaseError` (`src/lib/errors/shared.ts`). Convert urql errors with `GraphQLError.fromCombinedError` and Zod errors with `ZodValidationError.fromZodError`. Services wrap repository calls with `ServiceErrorWrapper` (`src/lib/utils/error-wrapper.ts`).
- `any` is a lint error outside `*.test.ts` files. Prefer small single-purpose functions and `map`/`filter`/`flatMap` over loops.
- Tests are Vitest files next to the code (`*.test.ts`, `*.integration.test.ts`), with `vi.fn` mocks.

## Reference

- `docs/ARCHITECTURE.md`: read before changing the diff engine or the deployment pipeline.
- `docs/ENTITY_REFERENCE.md`: per-entity fields and cross-entity references.
- `docs/COMMANDS.md`: every command and flag; `--help` is authoritative.
- `docs/LIMITS.md`: read caps, request pacing, retries, deploy batching.
- `docs/TROUBLESHOOTING.md`: known errors and their fixes.
