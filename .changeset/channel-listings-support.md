---
"saleor-configurator": patch
---

Add channel listings support for products and variants

You can now configure channel-specific settings for products and variants in your YAML configuration:

- **Product channel listings**: Set publication status, visibility, and availability dates per channel
- **Variant channel listings**: Configure pricing and cost price per channel for each variant

Example configuration:

```yaml
products:
  - name: "My Product"
    channelListings:
      - channel: "default-channel"
        isPublished: true
        visibleInListings: true
    variants:
      - name: "Default"
        sku: "PROD-001"
        channelListings:
          - channel: "default-channel"
            price: 29.99
            costPrice: 15.00
```
