# Rate Limiting Resilience Implementation Plan

## Scope

This plan targets deployment failures caused by Saleor GraphQL rate limiting (HTTP 429 and throttling behavior), while preserving `gql.tada` type safety and current layered architecture (`client -> repositories -> services -> deployment stages`).

## Goals

1. Reduce deployment failures caused by burst traffic and retry storms.
2. Keep throughput high for bulk operations without overwhelming Saleor.
3. Preserve idempotent deploy behavior for existing entities.
4. Improve observability so we can tune limits with real metrics.

## Current Risks To Address First

1. Category caching can return false negatives when category count exceeds the first page.
2. `Retry-After` is tracked but not globally enforced before outbound retries.
3. Product bulk update path treats optional channel/media sync failures as hard failures.
4. Existing-product variant flow is create-only in bulk path, risking idempotency regressions.
5. Product and category prefetch/query paths assume `first: 100` and can misclassify create vs update.

## Target Architecture

1. Single transport-level request governor for all GraphQL operations.
2. Global backpressure based on:
   1. max concurrency
   2. request interval cap/window
   3. `Retry-After` suspension gate
3. Retry policy remains centralized in GraphQL client, not spread across services.
4. Service-level delays become secondary safeguards only where ordering is required.
5. Stage metrics include reliable counts for retries, 429s, network failures, and GraphQL failures.

## Library Direction

### Recommended

Use `bottleneck` as the primary governor in GraphQL transport:

1. Handles concurrency and time-window quotas together.
2. Supports dynamic throttling when 429 bursts happen.
3. Works cleanly with existing urql exchange stack and typed repository/service layers.

### Keep

Keep `@urql/exchange-retry` for retry orchestration, but feed it with gate-aware behavior.

### Avoid

Avoid reintroducing mixed resilience primitives across layers (`opossum` + ad hoc delays + custom wrappers) unless a specific failure mode proves it is needed.

## Phased Implementation

## Phase 0: Security and Baseline

1. Rotate exposed token and scrub sensitive values in docs/specs.
2. Capture baseline metrics from current deploy reports:
   1. total duration
   2. stage durations
   3. rate limit count
   4. retry count
   5. failure count by stage
3. Define target thresholds for success:
   1. 429 hits reduced by at least 60%
   2. deploy failure rate from rate limits near zero
   3. no regression on idempotent redeploy

Acceptance criteria:

1. No live secrets in repo.
2. Baseline metrics documented for before/after comparison.

## Phase 1: Correctness Fixes Before Tuning

1. Fix category pagination/caching assumptions.
2. Remove false-null short-circuit behavior when cache is incomplete.
3. Fix product existence lookups for more than 100 slugs (chunked/paged lookups).
4. Align bulk product optional operations with graceful-degradation policy.
5. Add/restore idempotent handling for existing variants in bulk update path.

Acceptance criteria:

1. No duplicate creates caused by incomplete lookup pages.
2. Existing-product redeploy does not fail on expected “already exists” variant scenarios.
3. Optional channel/media sync failures do not hard-fail full product stage.

## Phase 2: Global GraphQL Governor

1. Introduce a transport-level scheduler module in `src/lib/graphql` or `src/lib/utils`.
2. Route all outgoing urql fetch operations through the scheduler.
3. Enforce:
   1. max concurrent in-flight requests
   2. request window cap
   3. global cooldown when `Retry-After` is present
4. Parse both numeric and HTTP-date `Retry-After` values.

Acceptance criteria:

1. A 429 response pauses subsequent requests globally for the cooldown window.
2. Burst workloads no longer produce immediate retry storms.

## Phase 3: Retry Policy Hardening

1. Keep retry rules narrow:
   1. network transient errors
   2. HTTP 429
   3. selected 5xx
2. Cap attempts and cumulative delay budget per operation.
3. For mutations, retry only if operation is safely repeatable by idempotency key/slug/SKU semantics.
4. Ensure retry logic and governor do not double-amplify delays.

Acceptance criteria:

1. Retries are bounded and explainable in logs.
2. Mutation retries do not create duplicate entities.

## Phase 4: Service Layer Simplification

1. Remove duplicated ad hoc delay logic where global governor already protects traffic.
2. Keep sequential ordering only where required by business constraints:
   1. parent -> child category creation
   2. explicitly ordered mutation chains
3. Normalize delay usage through shared config constants.

Acceptance criteria:

1. Delay logic is minimal and justified per module.
2. Throughput improves without reintroducing 429 bursts.

## Phase 5: Observability and Tuning

1. Ensure metrics cover:
   1. retries by stage
   2. 429 hits by stage and operation type
   3. network failures
   4. GraphQL error counts
2. Add operation labels (`query/mutation + operationName`) to logs for hotspots.
3. Tune scheduler limits using real deployment data.

Acceptance criteria:

1. Deploy reports clearly show where throttling happens.
2. Limits are tunable without code churn.

## Testing Plan

## Unit Tests

1. `Retry-After` parser:
   1. seconds format
   2. HTTP-date format
   3. invalid header handling
2. Governor behavior:
   1. concurrency cap
   2. cooldown gate
   3. queue drain behavior
3. Retry classification:
   1. retryable vs non-retryable errors

## Integration Tests

1. category lookup when entity count > 100
2. product lookup/update when slug list > 100
3. existing variant redeploy path
4. optional channel/media failures do not fail entire product stage

## E2E / Smoke

1. large config deploy with products, categories, shipping zones
2. immediate redeploy for idempotency check
3. simulated throttled environment (or mocked 429 bursts)

## Rollout Plan

1. Land Phase 1 fixes first (correctness).
2. Land Phase 2 and Phase 3 behind config flags:
   1. `GRAPHQL_MAX_CONCURRENCY`
   2. `GRAPHQL_INTERVAL_CAP`
   3. `GRAPHQL_INTERVAL_MS`
3. Enable gradually in CI/dev environments.
4. Monitor reports for 3 to 5 deployments before enabling as default.

## Rollback Plan

1. Keep a feature flag to disable governor and fall back to current behavior.
2. Keep retry exchange defaults available as safe fallback.
3. If severe regression appears, disable governor first, then re-evaluate per-module delays.

## Definition of Done

1. No secrets in repo.
2. Deployments are stable under high-change configs with no rate-limit-caused stage failures.
3. Idempotent redeploy passes for products/categories/variants.
4. Metrics and logs provide enough detail to tune limits without new instrumentation work.

## Execution Checklist (for Codex runs)

1. Implement Phase 1 correctness fixes and tests.
2. Implement governor module and wire client transport.
3. Update retry behavior to cooperate with governor.
4. Simplify service delays where redundant.
5. Run:
   1. targeted vitest suites for resilience/product/category/deployment
   2. full `pnpm test`
   3. `pnpm typecheck` (acknowledging any unrelated baseline failures)
6. Compare deployment reports before/after and adjust limits.
