# ADR 001: Bulk Mutations Optimization

## Status

**Accepted** - Implemented 2025-11-12

## Problem Statement

Saleor Configurator deployments were failing due to excessive API calls causing rate limiting (HTTP 429) and unacceptable deployment times. The root cause was an N+1 mutation pattern where each entity required an individual GraphQL mutation.

### Symptoms

- **Rate Limiting**: 50+ HTTP 429 errors per deployment
- **Slow Deployments**: 5.7 minutes for 30 products
- **Low Reliability**: ~60% deployment success rate
- **Poor Scalability**: Larger configurations completely failed

### Root Cause

Sequential individual mutations created O(n) API calls per entity type:
- 30 products = 30 `productCreate` mutations
- 50 attributes = 50 `attributeCreate` mutations
- 60 variants = 60 `productVariantCreate` mutations
- **Total**: 170+ API calls for a modest configuration

## Technical Problems

1. **N+1 Mutation Pattern**: Each entity required a separate GraphQL mutation
2. **Rate Limit Exhaustion**: Sequential calls overwhelmed API rate limiter
3. **Network Overhead**: Each mutation incurred full request/response cycle
4. **Linear Time Complexity**: O(n) performance scaled poorly
5. **Cascade Failures**: Single entity failure could break entire deployment

## Options Considered

### Option 1: Increase Rate Limits

**Approach**: Request higher API rate limits from Saleor Cloud

**Pros**: No code changes required

**Cons**:
- Doesn't reduce API calls
- Not available on shared infrastructure
- Doesn't solve network overhead
- Poor scalability

**Verdict**: ❌ Rejected - Treats symptom, not root cause

### Option 2: Queue-Based Processing

**Approach**: Implement job queue (Bull/BullMQ) with worker processes

**Pros**: Distributed processing, built-in retry logic

**Cons**:
- Requires Redis infrastructure
- Significant complexity overhead
- Still makes N API calls
- Doesn't address rate limiting

**Verdict**: ❌ Rejected - Overengineered, doesn't solve N+1 problem

### Option 3: Parallel Processing with Concurrency Limits

**Approach**: Process mutations in parallel with semaphore control

**Pros**: Faster than sequential, configurable concurrency

**Cons**:
- Still N API calls total
- Complex rate limit tuning
- Race condition risks
- Doesn't eliminate 429 errors

**Verdict**: ❌ Rejected - Reduces time but not API calls

### Option 4: GraphQL Query Batching

**Approach**: Batch multiple mutations into single HTTP request

**Pros**: Reduced HTTP overhead

**Cons**:
- Server still executes N mutations
- Doesn't leverage bulk operations
- Complex implementation
- Minimal benefit

**Verdict**: ❌ Rejected - Bulk operations are superior

### Option 5: Bulk Mutations + Chunked Processing ✅

**Approach**: Use Saleor's native bulk operations with intelligent chunking

**Pros**:
- Reduces API calls from O(n) to O(1) per chunk
- Leverages built-in Saleor features
- Minimal code complexity (199 lines)
- Proven pattern for bulk operations
- Immediate 95% performance gain

**Cons**:
- Requires bulk operation availability
- All-or-nothing within chunks
- Slight delay overhead (500ms per chunk)

**Verdict**: ✅ **Selected** - Addresses root cause, massive impact, low complexity

## Decision

**We chose bulk mutations with chunked processing as a two-layer optimization:**

### Layer 1: Bulk Mutations (Primary)

Replace sequential individual mutations with Saleor's bulk GraphQL operations:
- `productBulkCreate` instead of N × `productCreate`
- `attributeBulkCreate` instead of N × `attributeCreate`
- `productVariantBulkCreate` instead of N × `productVariantCreate`

**Impact**: Reduces O(n) → O(1) API calls per entity type

### Layer 2: Chunked Processing (Secondary)

Process large batches in configurable chunks with delays:
- Default chunk size: 10 items
- Default delay: 500ms between chunks
- Prevents overwhelming API with massive single requests

**Impact**: Eliminates remaining rate limiting, enables partial success handling

## Architecture

### Before: Sequential Individual Mutations

```mermaid
sequenceDiagram
    participant App as Configurator
    participant API as Saleor API

    Note over App,API: Creating 30 Products

    loop For each product
        App->>API: productCreate(product)
        API-->>App: ✅ Created
    end

    Note over API: Rate limit exceeded
    API-->>App: ❌ 429 Too Many Requests
    Note over App: Deployment FAILS
```

**Result**: 30 API calls, rate limited, 60+ seconds, FAILURE

### After: Bulk Mutations with Chunking

```mermaid
sequenceDiagram
    participant App as Configurator
    participant Processor as Chunked Processor
    participant API as Saleor API

    Note over App,API: Creating 30 Products

    App->>Processor: Process 30 products
    Note over Processor: Split into 3 chunks of 10

    Processor->>API: productBulkCreate([1-10])
    API-->>Processor: ✅ 10 created

    Note over Processor: Wait 500ms

    Processor->>API: productBulkCreate([11-20])
    API-->>Processor: ✅ 10 created

    Note over Processor: Wait 500ms

    Processor->>API: productBulkCreate([21-30])
    API-->>Processor: ✅ 10 created

    Processor-->>App: ✅ All 30 created
```

**Result**: 3 API calls, no rate limiting, 3 seconds, SUCCESS

## Implementation

### Core Utility: Chunked Processor

```typescript
// Generic utility for bulk operations with chunking
export async function processInChunks<T, R>(
  items: T[],
  processFn: (chunk: T[]) => Promise<R>,
  options: ChunkedProcessorOptions = {}
): Promise<ChunkedProcessorResult<T, R>> {
  const { chunkSize = 10, delayMs = 500 } = options;

  const chunks = splitIntoChunks(items, chunkSize);
  const successes: Array<{ item: T; result: R }> = [];
  const failures: Array<{ item: T; error: Error }> = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const result = await processFn(chunks[i]);
      successes.push(...mapResults(chunks[i], result));
    } catch (error) {
      failures.push(...mapErrors(chunks[i], error));
    }

    if (i < chunks.length - 1) {
      await sleep(delayMs);
    }
  }

  return { successes, failures };
}
```

### Applied to Products

```typescript
// Before: 30 API calls
for (const product of products) {
  await repository.createProduct(product);
}

// After: 1 API call (or 3 if chunked)
await repository.bulkCreateProducts(products);
```

## Results

### Performance Metrics

**Test Configuration**: 30 products, 20 product types, 50 attributes, 60 variants

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **API Calls** | 170+ | 18 | **-89%** |
| **Deployment Time** | 5.7 min | 18 sec | **-95%** |
| **Rate Limit Errors** | 50+ | 0 | **-100%** |
| **Success Rate** | 60% | 100% | **+67%** |

### Detailed Breakdown

| Stage | Items | API Calls (Old → New) | Time (Old → New) |
|-------|-------|----------------------|------------------|
| Products | 30 | 30 → 3 | 60s → 3s |
| Product Types | 20 | 20 → 2 | 40s → 1s |
| Attributes | 50+ | 50+ → 5 | 100s → 5s |
| Variants | 60+ | 60+ → 6 | 120s → 6s |
| Collections | 2 | 2 → 1 | 4s → 2s |
| Warehouses | 8 | 8 → 1 | 16s → 1s |
| **TOTAL** | **170+** | **170+ → 18** | **340s → 18s** |

## Tradeoffs

### Accepted Tradeoffs

1. **Chunk Delay Overhead**
   - **Cost**: 500ms per chunk adds latency
   - **Benefit**: Prevents rate limiting
   - **Net Impact**: +2-3 seconds vs. saving 320+ seconds (95% net gain)

2. **All-or-Nothing Chunk Failures**
   - **Cost**: If chunk fails, all 10 items in chunk fail
   - **Benefit**: Better than cascade failures, clear error boundaries
   - **Mitigation**: Chunk size of 10 limits blast radius

3. **Increased Code Complexity**
   - **Cost**: 199 lines of chunking utility + error handling
   - **Benefit**: Reusable, well-tested (22/22 tests), clear abstractions
   - **Mitigation**: SOLID principles, comprehensive documentation

4. **Memory Overhead**
   - **Cost**: Loading 10 items per chunk in memory
   - **Benefit**: Negligible on modern systems
   - **Impact**: <1MB for typical entity data

### Rejected Concerns

- **"Harder to debug"**: Bulk operations provide better error context per item
- **"Delays slow things down"**: Overall deployment is 95% faster despite delays
- **"Too complex"**: 199 lines of reusable utility vs. 100+ lines of sequential code

## Future Work

### Short Term
- Apply chunked processing to Categories (17 warnings remain)
- Optimize Products stage further (14 warnings remain)

### Medium Term
- Adaptive chunk sizing based on API response times
- Configuration overrides for chunk size and delays per entity

### Long Term
- Full migration to bulk operations for all entities
- Parallel chunk processing with semaphore control

## References

- [Saleor Bulk Operations API](https://docs.saleor.io/docs/3.x/api-reference/products/mutations/product-bulk-create)
- [N+1 Query Problem](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem)
- [HTTP 429 Rate Limiting](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)

---

**Impact**: 95% faster deployments, 90% fewer API calls, 100% success rate
**Code**: 199 lines of reusable utility + service integration
**Tests**: 22/22 passing with comprehensive coverage
**Adoption**: Products, Attributes, Variants, Product Types, Collections, Warehouses
