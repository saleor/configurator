# TypeScript DSL Roadmap

## Goals
- Deliver a Pulumi-style authoring experience for Saleor Configurator with full TypeScript power.
- Preserve existing YAML workflows during transition while offering automated migration paths.
- Guarantee type safety, deterministic execution, and high-quality tooling (build, lint, test) for TS configs.
- Enable modular, reusable configuration code shared across teams and environments.

## Phased Implementation

### Phase 0 – Foundation & Typing
- Document current DSL capabilities and missing features.
- Extend `tsconfig.json` and esbuild bundling to respect `config/*` path aliases.
- Generate TypeScript enums/interfaces from Zod schema for IDE autocomplete.
- Add Biome targets for `config/**/*.ts` and integrate into lint scripts.
- Expected outcome: typed imports available and lint pipeline ready for TS configs.

### Phase 1 – CLI Build & Preview
- Add `configurator build --config <file> [--out <path>] [--watch]` to compile stacks and emit validated JSON.
- Introduce `configurator preview` (DSL-aware diff alias) with clearer messaging.
- Improve error reporting with source maps and classify build-time vs runtime errors.
- Update documentation/testing to cover new commands.
- Expected outcome: developers can dry-run configs without touching Saleor and get actionable diagnostics.

### Phase 2 – Scaffolding & Project Structure
- Implement `configurator init --ts [--split catalog,fulfillment,…]` to generate:
  - `config/stack.ts` root entry.
  - Domain modules (`catalog.ts`, `fulfillment.ts`, etc.).
  - `config/env.ts` for environment awareness.
  - Sample vitest snapshot tests.
  - README snippet explaining workflow.
- Update `introspect` to support multi-file output `--split-by domain` (optional).
- Expected outcome: standardized layout encourages modular TS configs immediately.

### Phase 3 – DSL Enhancements
- Publish `@saleor/configurator/dsl/components` with higher-level builders (`createChannel`, `ProductCatalogBuilder`).
- Enforce deterministic execution (warn/error on `Math.random`, `Date.now`, outbound calls).
- Add uniqueness checks in the DSL runtime for slugs/names before deploy.
- Extend resource classes with helper methods (e.g., `channel.addCountry`).
- Expected outcome: authoring becomes concise, safer, and more expressive.

### Phase 4 – Migration & Interop
- Provide `configurator convert --from config.yml --to config.ts` utilizing runtime to produce formatted DSL.
- Enhance `introspect` TS output with optional domain splits and comments.
- Document dual-mode strategy and exit criteria for YAML deprecation.
- Expected outcome: teams migrate incrementally without manual rewrites.

### Phase 5 – Testing & Quality
- Encourage `pnpm configurator build --config config.ts --out snapshots/dev.json` in CI.
- Supply vitest helpers for config assertions and snapshot updates.
- Tighten Biome rules (no `any`, forbid unused exports) within `config/`.
- Ensure integration tests cover TS workflows end-to-end (build, preview, deploy).
- Expected outcome: automated safety net for TS configs and shared best practices.

### Phase 6 – Rollout & Enablement
- Update docs, README, and blog posts with TS-first examples, loops, and conditional patterns.
- Create quickstart videos/gifs demonstrating editing, build, preview, deploy.
- Collect feedback via beta flag, iterate on component library, and plan YAML sunset.
- Expected outcome: confident adoption and clear communication path to TS default.

## Implementation Notes
- **Enum/Type Generation:** Add script under `scripts/` that walks Zod schema and emits `src/dsl/types.ts`. Export unions for currencies, countries, etc., to reuse in configs.
- **Biome Integration:** Extend `biome.json` to include `"files.includes": ["config/**/*.ts"]` with stricter rules (no implicit `any`, prefer const, etc.).
- **Build Command:** Reuse existing esbuild pipeline but capture diagnostics; structure command to support watch mode by reusing incremental builds.
- **Scaffold Example:**
  ```ts
  // config/stack.ts
  import { defineStack, Channel } from "@saleor/configurator/dsl";
  import { env } from "./env";
  import { buildCatalog } from "./catalog";

  export default defineStack(env.stackName, () => {
    env.configureShop();

    for (const channel of env.channels) {
      new Channel(channel.slug, channel.props);
    }

    buildCatalog(env);
  });
  ```

- **Component Builder Example:**
  ```ts
  // config/lib/channel-factory.ts
  import type { ChannelProps } from "@saleor/configurator/dsl/types";
  import { Channel } from "@saleor/configurator/dsl";

  export function createMarketChannel(market: Market) {
    return new Channel(market.slug, {
      name: market.name,
      slug: market.slug,
      currencyCode: market.currency,
      defaultCountry: market.country,
      settings: defaultChannelSettings(market),
    } satisfies ChannelProps);
  }
  ```

- **Conversion Pipeline:** For `convert`, load YAML using existing manager, then feed `createDslProgram` to emit TS file(s).

## Expected Results
- Type-safe, modular configs with loops/conditionals become the primary workflow.
- Developers obtain fast feedback via `build --watch`, reducing deploy errors.
- Component library promotes reuse and consistency across projects.
- Migration tooling minimizes friction for existing YAML users.
- Enhanced lint/test coverage improves reliability and onboarding.

## Risks & Mitigations
- **Complexity:** TypeScript introduces potential non-determinism. Mitigate with validation hooks and lint rules enforcing deterministic constructs.
- **Adoption Curve:** Provide templates, docs, and training; keep YAML support until parity proven.
- **Performance:** esbuild watch mode keeps recompilation fast; only run full bundling for `build`/`preview` commands.
- **Maintenance:** Generate types from schema automatically to prevent drift.

## Success Metrics
- 80%+ new projects choose TS DSL within one release cycle.
- Reduction in deploy-time validation errors due to compile-time safety.
- Median diff time unchanged or improved for TS configs.
- Positive DX feedback (survey/NPS) after beta rollout.

