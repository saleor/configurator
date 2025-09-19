# Repository Guidelines

## Project Structure & Module Organization
Primary source code lives in `src/`. The CLI surface (`src/cli`) wires Commander commands defined in `src/commands`, while orchestration pipelines sit in `src/core`. Entity-specific logic belongs in `src/modules/<entity>` following the layered patterns described in `docs/ARCHITECTURE.md`. Shared tooling (GraphQL client, logging, schema helpers) is under `src/lib`. Tests mirror the structure in `src/__tests__` and `src/test-helpers`. Extended references, workflows, and troubleshooting live in `docs/`, with YAML samples in `recipes/`.

## Build, Test, and Development Commands
Install dependencies with `pnpm install`. `pnpm dev <command>` runs the CLI in watch mode (e.g., `pnpm dev introspect`). `pnpm build` bundles with tsup. Quality gates include `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`, and the CI stricter `pnpm check:ci`. Regenerate schemas after GraphQL changes via `pnpm fetch-schema`, `pnpm generate-json-schema`, and `pnpm generate-schema-docs`. Follow the end-to-end validation loop in `docs/TESTING_PROTOCOLS.md` before shipping CLI-impacting work.

## Coding Style & Naming Conventions
Biome (`biome.json`) enforces 2-space indentation, double quotes, trailing commas, and explicit ESM extensions. Keep file and directory names kebab-cased (`product-media.service.ts`). Favor pure functions and immutable data (see `docs/CODE_QUALITY.md`). Domain validation should start from Zod schemas so runtime types and TypeScript inference remain aligned.

## Testing Guidelines
Vitest drives unit (`*.test.ts`) and integration (`*.integration.test.ts`) coverage. Use fixtures from `src/test-helpers`. Mock GraphQL with the helpers in `src/lib/graphql/__mocks__`. Schema-affecting changes (e.g., external product media URLs) require schema regeneration, refreshed mocks, and the CLI workflow documented in `docs/TESTING_PROTOCOLS.md`. Target >90% coverage on services/utilities and document any exceptions during reviews.

## Commit & Pull Request Guidelines
Follow conventional commit prefixes (`feat:`, `fix:`, `chore:`) as seen in `git log`. Each impactful change should include a `pnpm changeset` entry. Pre-PR, execute the checklist from `docs/CLAUDE.md` (lint → build → test → `tsc --noEmit` → `pnpm check:ci`). PR descriptions must outline impacted commands, link issues, and attach diffs or console output when GraphQL schemas/configs shift.

## Agent Workflow Boosters
Treat `docs/CLAUDE.md` as the navigation hub. Favor repository-aware tools (symbol search, ripgrep, `pnpm test --watch`) for fast exploration, then drill into the relevant services or modules. Capture new prompts, schemas, or automation tips back into `docs/` so future agents inherit the context. When introducing external media URL support, align schema updates, mocks, and CLI messaging across the layered architecture before requesting review.
