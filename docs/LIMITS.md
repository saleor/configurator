# Limits

Fixed numbers that change what Configurator reads, how fast it sends requests, and how much it prints. Only the request pacing values can be changed, through environment variables.

## Reading from Saleor

`introspect` and `diff` read every entry of each top-level list, every product of each collection, all attributes with all their values, and all customer types. A list is read in pages of 100 until Saleor reports no more pages.

These reads are capped:

| Command | What is read | Cap |
|---|---|---|
| `introspect`, `diff` | Shipping zones listed under each warehouse | First 50 per warehouse |
| `introspect`, `diff` | Products and attributes, when reading all of them fails | First 100 of each, with a warning in the log |
| `deploy` | Existing warehouses, shipping zones, tax classes, menus, models and collections | First 100 of each |
| `deploy` | Existing products of a collection | First 100 per collection |
| `deploy` | Excluded products of a shipping zone | First 100 per zone |
| `deploy` | Products, product types and page types found by name | First 100 search results for the name |

`deploy` looks up products by slug in groups of 100 slugs per request.

## Request pacing

All GraphQL requests go through one queue. Apart from retries, Configurator adds no other waits between requests. The defaults keep within the Saleor Cloud free sandbox limit of 120 requests per minute. Raise them for paid sandboxes (2,000 per minute) and production, which has no fixed rate limit.

| Setting | Default | Environment variable |
|---|---|---|
| Queue enabled | Yes | `GRAPHQL_GOVERNOR_ENABLED` |
| Requests in flight | 1 | `GRAPHQL_MAX_CONCURRENCY` |
| Minimum gap between requests | 500 ms | `GRAPHQL_MIN_TIME_MS` |
| Requests per window | 120 | `GRAPHQL_INTERVAL_CAP` |
| Window length | 60,000 ms | `GRAPHQL_INTERVAL_MS` |
| Pause after a rate limit without `Retry-After` | 60,000 ms | `GRAPHQL_FALLBACK_COOLDOWN_MS` |

Fixed values:

- A `Retry-After` value longer than 5 minutes counts as 5 minutes.
- If rate limiting keeps the queue paused for more than 10 minutes, the command fails.
- `introspect` and `diff` stop paging with an error if Saleor returns the same cursor twice.

## Retries

Queries are retried. Mutations are retried only when repeating them is safe: updates, deletes and channel listing updates. A request is retried after a rate limit, a network error, or an HTTP 502, 503 or 504.

| Setting | Value |
|---|---|
| Attempts | 3 |
| First delay | 750 ms |
| Longest delay | 8,000 ms |
| Random jitter | Yes |

## Deploy batching

| Entity | Below the threshold | Above the threshold |
|---|---|---|
| Attributes (threshold 10) | One request each | Bulk mutations |
| Categories (threshold 10) | One at a time | Level by level, one at a time |
| Models (threshold 5) | Together | One at a time |
| Shipping zones (threshold 3) | Together | One at a time |

Product types, collections, warehouses and customer types are sent in batches of 10, one batch at a time.

## Output

`diff --github-comment` shortens the comment:

| What | Cap |
|---|---|
| Entities per section | 10 |
| Field changes per entity | 3 |
| Deletions listed | 5 |
| Characters per value | 30 |

`deploy` keeps the 5 newest reports in `.configurator/reports` and deletes older ones. Reports written outside that folder with `--report-path` are not deleted.
