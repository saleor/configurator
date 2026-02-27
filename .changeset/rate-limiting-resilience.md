---
"@saleor/configurator": minor
---

### Rate Limiting Resilience

Added comprehensive rate-limiting protection with request governance, smart retry policies, transient error propagation, and deployment resilience observability.

**GraphQL Governor (new):**
- Bottleneck-based request governor enforces concurrency (4) and throughput (20 req/s) limits on all GraphQL requests
- Cooldown mechanism pauses all queued requests when a 429 is detected, with configurable fallback (3s default)
- Env-var tunable: `GRAPHQL_GOVERNOR_ENABLED`, `GRAPHQL_MAX_CONCURRENCY`, `GRAPHQL_INTERVAL_CAP`, `GRAPHQL_INTERVAL_MS`, `GRAPHQL_FALLBACK_COOLDOWN_MS`

**Smart Retry Policy (new):**
- URQL `retryExchange` retries transport errors (429, 502, 503, 504) with exponential backoff (750ms–8s, 3 attempts, jitter)
- Mutations only retry if idempotent (Update, Delete, BulkUpdate, ChannelListingUpdate, UpdateMetadata)
- Queries always retry; subscriptions never retry

**Error Classification (new):**
- Central `isTransientError` / `isRateLimitError` / `isNetworkError` type guards used across all services
- `parseRetryAfter` supports numeric seconds and HTTP-date formats, clamped to 0–300s

**Transient Error Propagation:**
- All service error wrappers (`wrapServiceCall`, `wrapBatch`) now re-throw transient errors instead of wrapping them as domain errors
- Category, product, collection, shipping-zone, channel, and warehouse services propagate rate-limit and network errors up the call stack

**Category Improvements:**
- Session-scoped caching in repository: pre-fetch all categories, populate slug cache, add newly created categories to cache
- Repository now paginates `getAllCategories` query (previously single-page)
- New `bootstrapCategoriesOptimized()` with level-based tree flattening for large configs (>10 categories)
- Sequential processing with configurable delays (50ms–200ms between items/levels)
- Removed dead `getCategoryByName` method

**Product Improvements:**
- `getProductsBySlugsBulk` now deduplicates slugs and paginates in chunks of 100
- Category/channel/product-type resolution uses `wrapServiceCall` with transient error propagation
- Pre-populated category ID cache from bulk fetch

**Shipping Zone Improvements:**
- Sequential processing with 500ms delays for configs with >3 shipping zones
- 200ms delays between shipping method channel listing updates

**Deployment Pipeline:**
- Size-adaptive stage processing: categories (>10 → optimized), models (>5 → sequential with delays)
- Resilience tracker (AsyncLocalStorage-based) collects per-stage rate-limit, retry, GraphQL error, and network error counts
- Deployment summary now shows resilience stats section with top throttle hotspots
- Deployment JSON report includes full resilience metrics per stage and top 10 operation hotspots
- Removed unused `report-storage.ts`

**Housekeeping:**
- Eliminated `any[]` from `ErrorConstructor` type signature
- Added `bottleneck` dependency for request governance
- Centralized all delay/threshold/retry constants in `bulk-operation-constants.ts`
- Removed stale files: `config-backup-greenproject.yml`, `linear-task-ci-cd.md`
