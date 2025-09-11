---
"@saleor/configurator": minor
---

**Complete Product Management Support**

Added full product management capabilities to the Saleor Configurator. You can now manage your entire product catalog through YAML configuration with complete round-trip integrity.

**Key Features:**
- Product lifecycle management with variants through YAML configuration
- Multi-channel pricing and availability configuration for product variants
- Support for all attribute types (plain text, dropdown, reference) with validation
- SKU-based idempotency for reliable product variant updates
- Detailed diff detection showing exact changes to be applied
- Slug-based product identification for consistent cross-environment behavior

**Workflow Integration:**
- `introspect`: Download complete product catalog to YAML files
- `diff`: Preview exact product changes before deployment
- `push`: Deploy configurations with automatic create/update detection

**Example Configuration:**
```yaml
products:
  - name: "The Clean Coder"
    slug: "clean-coder"
    productType: "Book"
    category: "programming"
    variants:
      - name: "Hardcover"
        sku: "CLEAN-CODER-HC"
        price: 39.99
      - name: "Paperback" 
        sku: "CLEAN-CODER-PB"
        price: 29.99
    channelListings:
      - channel: "default"
        isPublished: true
        availableForPurchase: "2024-01-01"
```

This completes the "commerce as code" workflow for product management alongside existing support for channels, categories, and product types.
