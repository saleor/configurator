---
"@saleor/configurator": minor
---

### Rate Limiting Resilience

Added comprehensive rate limiting protection and reduced API calls across product and category operations.

**Category Improvements:**
- Added session-scoped caching for categories (73% fewer rate limits, 39% faster)
- Pre-fetch all categories before bootstrap to prime cache
- Simplified lookup logic: removed redundant `getCategoryByName` fallback
- Adaptive delays between category operations using `rateLimiter.getAdaptiveDelay()`
- Added rate limit detection with proper type guards (`isRateLimitError`, `hasNetworkErrorStatus`)

**Product Improvements:**
- Reduced API calls from 151+ to 1-5 when creating 50 products with variants
- New products now use Saleor's nested bulk mutations (channelListings, variants, and media inline)

**Resilience Architecture:**
- URQL `retryExchange` handles transport-level retry (3 attempts, exponential 1-15s, jitter)
- `AdaptiveRateLimiter` tracks 429 errors in a 60s rolling window and adjusts delays automatically
- All services (category, collection, warehouse, shipping-zone) use adaptive delays via `rateLimiter.getAdaptiveDelay()`
- Resilience tracker provides per-stage observability metrics

**Shipping Zone Improvements:**
- Added 200ms delays between channel listing updates
- Sequential processing with adaptive delays for configurations with more than 3 shipping zones
