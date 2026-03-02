# Configurator CLI - Agentic Workflow Improvements Report

This report documents difficulties encountered and suggested improvements for making the Saleor Configurator CLI more friendly to AI agents and automated workflows.

## Session Summary

**Date:** 2026-02-04
**Task:** Deploy a comprehensive tire store configuration to a fresh Saleor Cloud instance
**Outcome:** Partial success with multiple iterations required

---

## 1. Schema Validation Errors

### Problem
Validation errors are verbose but lack actionable guidance. Example:
```
invalid_union: No matching discriminator
path: ['productTypes', 0, 'productAttributes', 0]
```

This error doesn't tell you:
- What format IS expected
- What the valid discriminator values are
- Example of correct syntax

### Suggested Improvements
1. **Include expected format in error messages:**
   ```
   productTypes[0].productAttributes[0]: Invalid format.
   Expected one of:
   - Inline attribute: { name: "Brand", inputType: "DROPDOWN", values: [...] }
   - Reference: { attribute: "Brand" }
   Received: { name: "Brand" }
   ```

2. **Add `--validate` command** to check config without deploying
3. **Generate JSON Schema** for IDE autocompletion

---

## 2. Attribute Reference Format Ambiguity

### Problem
The config schema accepts two formats for product type attributes:
1. Inline definition: `{ name, inputType, values }`
2. Reference: `{ attribute: "AttributeName" }`

But the documentation/examples often show `- name: Brand` which is invalid.

### Suggested Improvements
1. **Stricter schema with better error messages**
2. **Document both formats clearly** in YAML comments
3. **Consider simplifying** to just string references: `- Brand`

---

## 3. Bug: Shipping Zone Price Format

### Problem Found & Fixed
`minimumOrderPrice` and `maximumOrderPrice` were being sent as objects:
```typescript
{ amount: 150, currency: "USD" }
```
But the GraphQL API expects `PositiveDecimal` (just a number).

### Location
`src/modules/shipping-zone/shipping-zone-service.ts` - 3 occurrences fixed

### Suggested Improvements
1. **Add integration tests** that actually call the API
2. **Type-check GraphQL inputs** against schema at build time

---

## 4. Collection Creation Server Errors

### Problem
Collection creation consistently fails with:
```
Expecting value: line 1 column 1 (char 0)
```
This indicates the server returns an empty response body.

### Impact
- Collections cannot be created via CLI
- Must use Saleor Dashboard manually

### Suggested Improvements
1. **Better error handling** for empty responses
2. **Retry logic** with exponential backoff
3. **Diagnostic mode** that logs raw HTTP responses

---

## 5. Rate Limiting (429 Errors)

### Problem
Saleor Cloud aggressively rate limits API requests. During bulk operations:
- Product updates fail mid-way
- Results are inconsistent between runs
- No built-in retry/backoff mechanism

### Suggested Improvements
1. **Built-in rate limit handling:**
   ```typescript
   // Automatic retry with exponential backoff
   // Configurable concurrency limits
   --max-concurrent=5
   --retry-on-rate-limit
   ```

2. **Progress persistence:**
   ```bash
   # Resume from where it left off
   configurator deploy --resume
   ```

3. **Batch operations** to reduce API calls

---

## 6. Missing `--include` Flag for Deploy

### Problem
The `introspect` command has `--include` and `--exclude` flags, but `deploy` doesn't.

When only certain entities fail, you must redeploy everything, which:
- Wastes time
- Increases rate limiting risk
- Makes debugging harder

### Suggested Improvements
```bash
# Deploy only specific entity types
configurator deploy --include=products,collections

# Skip problematic entities
configurator deploy --exclude=collections
```

---

## 7. Interactive Prompts Block Automation

### Problem
Without `--ci` flag, deploy asks for confirmation, which blocks automated workflows.

The prompt also times out ungracefully:
```
ExitPromptError: User force closed the prompt with 0 null
```

### Suggested Improvements
1. **Default to non-interactive** when stdin is not a TTY
2. **Better timeout handling** with clear error message
3. **`--yes` flag** as alternative to `--ci`

---

## 8. Verbose Flag Issues

### Problem
The `--verbose` flag behavior is confusing:
```bash
--verbose        # "argument missing"
--verbose=true   # "Expected boolean, received string"
--verbose true   # Works? Unclear
```

### Suggested Improvements
1. **Boolean flags shouldn't require values**: `--verbose` should work
2. **Document flag usage** in help text
3. **Consider `LOG_LEVEL=debug`** environment variable instead

---

## 9. Category Reference Confusion

### Problem
Products reference categories by slug, but:
- Subcategory slugs must be globally unique
- No clear error when category doesn't exist
- Introspected config may have different slug format

Example error:
```
Category "kemikaalit-paikkaus" not found
```

### Suggested Improvements
1. **Validate category references** before deployment starts
2. **Support path-based references**: `rengastarvikkeet/kemikaalit/paikkaus`
3. **List available categories** in error message

---

## 10. Diff Output for AI Agents

### Problem
Diff output uses visual formatting (colors, boxes) that's hard for AI to parse:
```
╭─────────────────────────────────────────────────────────╮
│ 🔄 34 changes will be applied to your Saleor instance │
```

### Suggested Improvements
1. **`--format=json`** for machine-readable output
2. **`--format=markdown`** for AI-friendly text
3. **Structured diff objects** in deployment reports

---

## 11. Deployment Report Accessibility

### Problem
Deployment reports are saved as JSON but:
- File path only shown at end of output
- No easy way to query specific failures
- Large files hard to parse

### Suggested Improvements
1. **Summary at end of output:**
   ```
   Failed products:
   - maxxis-premitra-ice-nord-np5-plus: Rate Limited
   - tech-fast-dry-vulkanointineste: Category not found
   ```

2. **`--report-format=summary`** for concise output
3. **Query tool:**
   ```bash
   configurator report --failures deployment-report.json
   ```

---

## 12. Environment Variable Support

### Problem
Credentials must be passed as CLI flags every time:
```bash
--url=https://... --token=...
```

### Suggested Improvements
1. **Environment variables:**
   ```bash
   export SALEOR_URL=https://...
   export SALEOR_TOKEN=...
   configurator deploy
   ```

2. **`.env` file support**
3. **Config file for defaults:**
   ```yaml
   # .configurator.yml
   url: https://...
   token: ${SALEOR_TOKEN}
   ```

---

## 13. Idempotency Issues

### Problem
Running deploy multiple times should converge to desired state, but:
- Some operations fail on retry (already exists)
- Attribute values can't be deleted if used by products
- Order of operations matters

### Suggested Improvements
1. **True idempotent operations** (upsert semantics)
2. **Dependency resolution** before deployment
3. **`--force` flag** for destructive operations

---

---

## 14. Rate Limit Detection & Diagnostics

### Current Behavior
When rate limiting (429) occurs, the error message is generic:
```
Rate Limited (429)
The API is rate limiting your requests.
```

No information about:
- Which entity/operation triggered the limit
- How many requests were made before hitting the limit
- Which GraphQL operation was rate limited

### Where Rate Limits Occurred (This Session)

| Stage | Duration | API Calls (est.) | Rate Limited? |
|-------|----------|------------------|---------------|
| Categories | 51s | ~80 (nested) | No |
| Products | 51s | ~50 (variants) | **Yes** |
| Shipping Zones | 12s | ~15 | **Yes** |
| Menus | 14s | ~20 | No |

**Key Insight:** Products and shipping zones hit rate limits due to:
1. **Variant updates** - Each variant requires separate API calls for attributes
2. **Channel listings** - Each shipping method × channel combination
3. **Bulk operations** - Even with chunking, concurrent requests trigger limits

### Rate Limit Sources in Code

1. **GraphQL Client** (`src/lib/graphql/client.ts:47-51`)
   - Logs `operationName` but not entity context
   - Retries up to 3 times with exponential backoff

2. **Product Service** (`src/modules/product/product-service.ts`)
   - `bootstrapProductsBulk` makes many parallel calls
   - Variant attribute updates are sequential but rapid

3. **Shipping Zone Service** (`src/modules/shipping-zone/shipping-zone-service.ts`)
   - `syncShippingMethods` updates channel listings individually
   - No delay between channel listing updates

### Suggested Improvements

1. **Add entity context to rate limit errors:**
   ```typescript
   // Current
   logger.warn(`Rate limited on operation ${operation.kind}`);

   // Improved
   logger.warn(`Rate limited on ${operation.kind}`, {
     operationName: operation.context.operationName,
     entityType: operation.context.entityType,  // NEW
     entityId: operation.context.entityId,      // NEW
     attemptNumber: attempt,
   });
   ```

2. **Track API call counts per stage:**
   ```typescript
   const metrics = {
     stage: 'products',
     apiCalls: 47,
     rateLimited: 3,
     retries: 5,
     duration: 51432,
   };
   ```

3. **Add rate limit summary to deployment report:**
   ```json
   {
     "rateLimiting": {
       "totalRateLimited": 8,
       "byStage": {
         "products": 5,
         "shippingZones": 3
       },
       "byOperation": {
         "ProductVariantBulkUpdate": 3,
         "ShippingMethodChannelListingUpdate": 3,
         "ProductUpdate": 2
       }
     }
   }
   ```

4. **Configurable concurrency limits:**
   ```bash
   configurator deploy --max-concurrent=3 --delay-between-calls=200
   ```

5. **Adaptive rate limiting:**
   ```typescript
   // Automatically slow down when rate limits detected
   if (rateLimitCount > 2) {
     delayMs = delayMs * 2;  // Exponential backoff
   }
   ```

---

## Priority Ranking for AI/Agentic Workflows

| Priority | Issue | Impact |
|----------|-------|--------|
| **P0** | Rate limiting handling | Blocks all bulk operations |
| **P0** | `--include/--exclude` for deploy | Critical for debugging |
| **P1** | Better validation errors | Reduces iteration cycles |
| **P1** | JSON/structured output | Enables programmatic parsing |
| **P1** | Environment variable support | Simplifies automation |
| **P2** | Shipping zone bug (FIXED) | Was blocking deployments |
| **P2** | Collection server errors | Investigate Saleor Cloud issue |
| **P2** | Resume capability | Handles partial failures |
| **P3** | Verbose flag fix | Minor usability |
| **P3** | Category path references | Nice to have |

---

## Recommended Quick Wins

1. **Add `--format=json` to all commands** - Easy to implement, high value
2. **Environment variable support** - Standard practice, low effort
3. **Better validation error messages** - Moderate effort, high value
4. **Rate limit retry logic** - Moderate effort, critical for reliability

---

## Appendix: Session Timeline

1. Initial deploy attempt - Schema validation failure (attribute format)
2. Fixed attribute format - Deploy partially succeeded
3. Shipping zones failed - Found minimumOrderPrice bug
4. Fixed bug, redeployed - Rate limited
5. Multiple retries - Eventually most entities synced
6. Collections never succeeded - Server-side issue
7. Products partially synced - Rate limiting prevented completion

Total time: ~45 minutes for what should be a 5-minute operation.
