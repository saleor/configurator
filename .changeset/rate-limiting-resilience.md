---
"@saleor/configurator": minor
---

### Rate-Limiting Resilience

Deployments against Saleor Cloud were failing on every run. When Saleor's API responded with "slow down" (rate limit), the configurator treated it as a permanent error instead of waiting and retrying. This caused partial deployments that left stores in an inconsistent state — products created without variants, missing attributes, broken references — requiring manual cleanup.

**Deployments now complete successfully.** Rate limits are handled automatically with backoff and retry. The same config that previously failed every time now deploys cleanly in all scenarios.

Before/after on the same config, same Saleor instance:
- Before: 3/3 deploys failed (exit code 5), 4m30s average, corrupted store state
- After: 3/3 deploys succeeded (exit code 0), 1m02s average, clean state

**Faster stage execution** from eliminating error-handling overhead and cascading failures:
- Categories: 53s → 3.8s
- Products: 33.5s → 7.6s

**Request governor** proactively limits request rate to stay under Saleor's limits (configurable via env vars: `GRAPHQL_GOVERNOR_ENABLED`, `GRAPHQL_MAX_CONCURRENCY`, `GRAPHQL_INTERVAL_CAP`, `GRAPHQL_INTERVAL_MS`).

**Deployment reports now show what happened** when rate limits occur — which operations were throttled, in which stages, and how many retries were needed. Previously this information was lost.

**Silent data loss fixed.** Attribute resolution failures were silently ignored, causing products to be created with missing attributes and no error reported. These now fail explicitly.
