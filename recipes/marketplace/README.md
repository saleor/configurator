# Marketplace Recipe

A complete multi-vendor marketplace configuration for Saleor, enabling platform business models with vendor management, commission tracking, and order splitting capabilities.

## 🎯 Use Cases

- **Multi-vendor e-commerce platforms** (like Amazon, eBay)
- **B2B2C marketplaces** connecting businesses with consumers
- **Service marketplaces** (consultants, freelancers)
- **Niche vertical marketplaces** (handmade goods, vintage items)
- **Regional marketplace platforms**

## 🚀 Quick Start

```bash
# Initialize a new marketplace
npx @saleor/configurator init --recipe marketplace

# Or apply to existing configuration
npx @saleor/configurator apply --recipe marketplace

# Deploy to your Saleor instance
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📋 What's Included

### Product Types
- **Marketplace Product**: Physical products with vendor tracking
- **Digital Product**: Non-physical goods with instant delivery

### Key Attributes

#### Vendor Management
- Vendor Name & ID
- Commission Rate (customizable per vendor)
- Fulfillment Type (Vendor/Platform/Dropship)
- Return Policy
- Vendor SKU tracking

#### Product Attributes
- Product Condition (New/Refurbished/Used)
- Shipping Time estimates
- Digital license types
- Delivery methods

### Page Types

#### Vendor Profile
Complete vendor information including:
- Company details
- Business registration
- Rating system
- Banking details (encrypted)
- Support contacts
- Vendor status tracking

#### Vendor Agreement
Legal and commercial terms:
- Agreement types (Standard/Premium/Enterprise)
- Commission structures
- Payment terms
- Document storage

### Categories
Pre-configured category structure:
- Electronics
- Fashion
- Home & Garden
- Sports & Outdoors
- Books & Media

Each with relevant subcategories for easy product organization.

## 🔧 Customization Guide

### Adjusting Commission Rates

The default commission rate is 15%. To change it, modify the `commission-rate` attribute:

```yaml
- name: "Commission Rate"
  slug: commission-rate
  inputType: NUMERIC
  unit: "%"
  metadata:
    min: "0"
    max: "100"
    default: "20"  # Change default here
```

### Adding New Vendor Statuses

Extend the vendor status options in the Vendor Profile page type:

```yaml
- name: "Vendor Status"
  slug: vendor-status
  inputType: DROPDOWN
  values:
    - name: "Active"
      slug: active
    - name: "Premium Partner"  # Add new status
      slug: premium-partner
    - name: "Suspended"
      slug: suspended
```

### Regional Marketplaces

Add region-specific channels:

```yaml
channels:
  - name: "US Marketplace"
    currencyCode: USD
    defaultCountry: US
    slug: us-marketplace
  
  - name: "EU Marketplace"
    currencyCode: EUR
    defaultCountry: DE
    slug: eu-marketplace
```

## 🏗️ Architecture Considerations

### Vendor Isolation
- Use vendor ID for filtering products
- Implement vendor-specific dashboards
- Separate order management per vendor

### Commission Calculation
- Store commission rate as product attribute
- Calculate during order processing
- Track in order metadata

### Order Splitting
- Group items by vendor
- Create sub-orders per vendor
- Handle partial fulfillment

## 📊 Recommended Extensions

### Analytics
- Vendor performance tracking
- Commission reporting
- Sales analytics per category

### Integrations
- Payment splitting services
- Vendor onboarding workflows
- Review and rating systems

## 🔗 Related Documentation

- [Saleor Marketplace Recipe](https://docs.saleor.io/recipes/marketplace)
- [Multi-vendor Implementation Guide](https://docs.saleor.io/guides/multi-vendor)
- [Attribute System](https://docs.saleor.io/developer/attributes)

## 💡 Tips & Best Practices

1. **Vendor Onboarding**: Create a streamlined onboarding flow with required documents
2. **Commission Flexibility**: Consider category-based commission rates
3. **Quality Control**: Implement vendor rating thresholds
4. **Dispute Resolution**: Add dispute status to orders
5. **Vendor Payments**: Integrate with payment splitting services

## 🤝 Support

For questions about this recipe:
- [GitHub Issues](https://github.com/saleor/configurator/issues)
- [Discord Community](https://discord.gg/saleor)
- [Saleor Documentation](https://docs.saleor.io)