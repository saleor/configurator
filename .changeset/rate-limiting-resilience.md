---
"@saleor/configurator": minor
---

### Rate Limiting Resilience

Added comprehensive rate limiting protection and dramatically reduced API calls for bulk product operations.

**Performance Improvements:**
- Reduced API calls from 151+ to 1-5 when creating 50 products with variants
- New products now use Saleor's nested bulk mutations (channelListings, variants, and media inline)

**Resilience Features:**
- Adaptive rate limiter that tracks 429 errors and adjusts delays automatically
- Retry wrapper with exponential backoff (5 retries, 1-30s delays, jitter)
- Concurrency limiter (max 10 parallel requests) with dynamic adjustment
- Circuit breaker to prevent cascading failures

**Shipping Zone Improvements:**
- Added 200ms delays between channel listing updates
- Sequential processing with 500ms delays for configurations with more than 3 shipping zones

**New Utilities:**
- `executeWithResilience()` wrapper for GraphQL operations
- `src/lib/utils/resilience.ts` module with reusable rate limiting utilities
