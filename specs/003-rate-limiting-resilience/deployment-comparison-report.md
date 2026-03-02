# Deployment Comparison Report

**Feature:** Category Rate Limiting Resilience
**Date:** 2026-02-05

---

## Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Duration** | 3m 43s | 2m 30s | **-32.6%** |
| **Rate Limit Hits** | 19 | 5 | **-73.7%** |
| **Retry Attempts** | 19 | 5 | **-73.7%** |

---

## Stage-by-Stage Comparison

| Stage | Before | After | Δ |
|-------|--------|-------|---|
| Validating configuration | 16ms | 18ms | +2ms |
| Updating shop settings | 460ms | 551ms | +91ms |
| Managing tax classes | 436ms | 270ms | -166ms |
| Managing attributes | 871ms | 866ms | -5ms |
| Managing product types | 5.5s | 4.8s | -700ms |
| Managing channels | 440ms | 887ms | +447ms |
| Managing page types | 651ms | 579ms | -72ms |
| **Managing categories** | **3m 16s** | **2m 0s** | **-1m 16s** |
| Managing menus | 9.2s | 8.9s | -300ms |
| Managing warehouses | 947ms | 1.3s | +353ms |
| Managing shipping zones | 4.4s | 2.9s | -1.5s |
| Preparing attribute choices | 1.2s | 1.5s | +300ms |
| Managing products | 2.7s | 7.3s | +4.6s |

---

## Categories Stage Detail

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Duration | 196,011ms | 120,221ms | **-75,790ms** |
| Rate Limit Hits | 19 | 5 | **-14** |
| % of Total Time | 88% | 80% | -8pp |

---

## Resilience Metrics

### Before
```json
{
  "rateLimitHits": 19,
  "retryAttempts": 19,
  "graphqlErrors": 0,
  "networkErrors": 0
}
```

### After
```json
{
  "rateLimitHits": 5,
  "retryAttempts": 5,
  "graphqlErrors": 0,
  "networkErrors": 0
}
```

---

## Changes Deployed

| Entity Type | Created | Updated | Deleted |
|-------------|---------|---------|---------|
| Channels | 0 | 0 | 25 |
| Attributes | 22 | 0 | 0 |
| Product Types | 13 | 0 | 0 |
| Page Types | 2 | 0 | 0 |
| Categories | 2 | 0 | 0 |
| Products | 9 | 0 | 0 |
| Menus | 0 | 2 | 6 |
| Warehouses | 1 | 0 | 0 |
| Shipping Zones | 3 | 0 | 0 |
| Tax Classes | 0 | 0 | 9 |
| **Total** | **51** | **2-3** | **40** |

---

## Raw Data

- **Before:** [`beforeJson.json`](./beforeJson.json)
- **After:** [`afterJson.json`](./afterJson.json)

---

## Conclusion

The category caching implementation successfully:

1. **Reduced rate limits by 74%** (19 → 5)
2. **Sped up categories by 39%** (3m 16s → 2m 0s)
3. **Reduced total deployment time by 33%** (3m 43s → 2m 30s)

Categories remain the slowest stage (80% of total time) due to sequential parent-child creation requirements, but rate limiting is no longer a significant issue.
