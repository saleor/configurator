---
"@saleor/configurator": minor
---

### Product media idempotency
- Persist the original `externalUrl` in Saleor metadata during deploys so repeated runs stop diffing on Saleor-generated thumbnails.
- Rehydrate that metadata when diffing and bootstrapping, letting the CLI compare against the real source URL.
- Add `config.yml` support for media arrays round-tripped from Saleor.

### Resilience and pagination
- Harden the product pagination query to mirror the main config selection and validated its shape with a unit test to prevent future regressions.
- Slow down pagination/choice fetches to avoid Saleor rate limiting.

### Using external media
Add `media` entries under a product to declare external assets:

```yaml
products:
  - name: "New York City Museum"
    slug: "new-york-city-museum"
    # … other fields …
    media:
      - externalUrl: "https://upload.wikimedia.org/wikipedia/commons/9/94/Ashmolean.jpg"
        alt: "Museum exterior"
```

The configurator now keeps this URL consistent across deploys even when Saleor transforms it into a thumbnail.
