# Limits

Fixed numbers that change what Configurator reads, how fast it sends requests, and how much it prints. Only the request pacing values and the product bulk-create batch size can be changed, through environment variables.

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

All GraphQL requests go through one queue. Its defaults keep within the Saleor Cloud sandbox limit of 120 requests per minute.

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
- `introspect` and `diff` wait 50 ms between pages of a list, and 100 ms between reading products, attributes and customer types.

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
| Categories (threshold 10) | One at a time, 100 ms apart | Level by level, one at a time, 50 ms apart |
| Models (threshold 5) | Together | One at a time, 100 ms apart |
| Shipping zones (threshold 3) | Together | One at a time, 500 ms apart |

Product types, collections, warehouses and customer types are sent in batches of 10, 500 ms apart. Each shipping method channel listing update is followed by a 200 ms pause.

### Products

New products are sent in fixed batches of 25 per `productBulkCreate` request, in `config.yml` order.

| Setting | Default | Environment variable |
|---|---|---|
| New products per `productBulkCreate` batch | 25 | `SALEOR_PRODUCT_BATCH_SIZE` |
| Slug check interval after a 504 / network error | 5,000 ms | — |
| Slug check deadline after a 504 / network error | 60,000 ms | — |

Saleor Cloud's gateway cuts off requests after 30 seconds with a `504 Gateway Time-out`, while Saleor keeps running and commits the batch's single database transaction in the background. When a batch hits a 504 or network error, `deploy` does not immediately resend: it polls the batch's slugs until they appear or the 60-second deadline passes, and resends only missing products once. If a deploy still finishes with failures, re-running `deploy` is safe and resumes from what is missing.

Fast production stores with light products can raise `SALEOR_PRODUCT_BATCH_SIZE`, though products with many variants or slow external image hosts (Saleor probes every image URL synchronously) can still push larger batches past 30 seconds.

### Large catalogs and scope

Saleor does the same server work per product regardless of batch size, so importing a few thousand products takes tens of minutes (often 10–35 minutes depending on store tier, variants, and image hosts).

Configurator fits store structure (channels, attributes, product types, categories), catalogs of a few hundred products, and occasional one-off imports of a few thousand products (ideally run unattended in CI so you do not need to keep a local terminal open). Catalogs of thousands of products that change daily (such as supplier stock or price feeds) belong in a dedicated sync or Saleor app rather than `config.yml`.

## Output

`diff --github-comment` shortens the comment:

| What | Cap |
|---|---|
| Entities per section | 10 |
| Field changes per entity | 3 |
| Deletions listed | 5 |
| Characters per value | 30 |

`deploy` keeps the 5 newest reports in `.configurator/reports` and deletes older ones. Reports written outside that folder with `--report-path` are not deleted.
