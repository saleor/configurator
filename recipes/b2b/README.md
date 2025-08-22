# B2B Wholesale Recipe

Complete business-to-business configuration with volume pricing, approval workflows, payment terms, and wholesale-specific features.

## 🎯 Use Cases

- **Wholesale distributors**
- **Manufacturing suppliers**
- **B2B marketplaces**
- **Industrial equipment vendors**
- **Office supply companies**
- **Medical suppliers**
- **Food service distributors**
- **Corporate procurement portals**

## 🚀 Quick Start

```bash
# Initialize a new B2B wholesale platform
npx @saleor/configurator init --recipe b2b

# Or apply to existing configuration
npx @saleor/configurator apply --recipe b2b

# Deploy to your Saleor instance
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📋 What's Included

### Channels

#### Wholesale Portal
Main B2B channel with:
- $500 minimum order value
- Manual order approval workflow
- NET payment terms enabled
- 30-day quote validity
- Net pricing display (no tax)

#### VIP Partners
Premium channel featuring:
- $250 minimum order (reduced)
- Auto-approval for trusted partners
- Extended 60-day quotes
- Priority fulfillment

### Product Types

#### Wholesale Product
Comprehensive B2B attributes:
- **Ordering**: MOQ, case pack quantities
- **Pricing**: Volume pricing tiers
- **Logistics**: Lead times, country of origin
- **Compliance**: Certifications, data sheets
- **Terms**: Payment terms, warranties
- **Options**: Private label, drop shipping

#### Industrial Equipment
Specialized for machinery and tools:
- Power requirements
- Dimensions and weight
- Installation services
- Training programs
- Service contracts

### Key Features

#### Volume Pricing
```yaml
Volume Pricing Tiers:
10-49 units: 5% discount
50-99 units: 10% discount
100-499 units: 15% discount
500+ units: 20% discount
```

#### Payment Terms
- Prepaid
- NET 15/30/45/60
- 2/10 NET 30 (2% discount if paid within 10 days)

#### Lead Times
- In Stock
- 1-3 business days
- 1-4 weeks
- Made to Order

### Page Types

#### Company Profile
Complete B2B customer management:
- Business information (type, size, revenue)
- Tax documentation (EIN, D-U-N-S)
- Credit management
- Payment terms approval
- Document storage (W9, certificates)

#### Quote Request
RFQ workflow support:
- Quote number tracking
- Validity periods
- Product references
- Special requirements
- Status management

### Categories

Industry-specific organization:
```
Industrial Supplies/
├── Safety Equipment
├── Tools & Hardware
├── Machinery
└── Raw Materials

Office Supplies/
├── Furniture
├── Technology
└── Stationery

Medical Supplies/
Food Service/
Clearance/
```

## 🔧 Customization Guide

### Adjusting Minimum Orders

Modify channel settings:

```yaml
channels:
  - name: "Wholesale Portal"
    settings:
      minimumOrderValue: 1000  # Increase to $1000
```

### Adding Payment Terms

Extend payment options:

```yaml
- name: "Payment Terms"
  values:
    - name: "NET 90"
      slug: net-90
    - name: "1/10 NET 30"  # 1% discount for 10-day payment
      slug: 1-10-net-30
```

### Custom Certifications

Add industry-specific certifications:

```yaml
- name: "Certifications"
  values:
    - name: "FDA Approved"
      slug: fda-approved
    - name: "USDA Organic"
      slug: usda-organic
```

### Volume Pricing Rules

Define complex pricing tiers:

```yaml
metadata:
  pricing_rules: |
    1-9: List Price
    10-24: -5%
    25-49: -10%
    50-99: -15%
    100-249: -20%
    250-499: -25%
    500+: Call for Quote
```

## 🏗️ Implementation Best Practices

### Customer Onboarding
1. **Credit Application**: Require for NET terms
2. **Document Verification**: Tax exemption certificates
3. **Approval Workflow**: Multi-step verification
4. **Credit Limits**: Set based on business size

### Pricing Strategy
1. **Tiered Pricing**: Implement quantity breaks
2. **Contract Pricing**: Customer-specific rates
3. **Hide Pricing**: For non-approved accounts
4. **Quote System**: For large/custom orders

### Order Management
1. **Approval Queue**: For new customers
2. **Credit Checks**: Before large orders
3. **Partial Shipments**: For available inventory
4. **Backorder Management**: For out-of-stock items

### Integration Points
1. **ERP Systems**: SAP, NetSuite, Dynamics
2. **CRM**: Salesforce, HubSpot
3. **Accounting**: QuickBooks, Xero
4. **Logistics**: 3PL providers

## 📊 Recommended Features

### Analytics & Reporting
- Customer lifetime value
- Product velocity reports
- Payment term analysis
- Quote-to-order conversion
- Customer credit utilization

### Automation
- Auto-approve repeat customers
- Reorder reminders
- Quote expiration notices
- Payment due alerts
- Low stock notifications

### Customer Portal Features
- Order history
- Invoice downloads
- Statement of account
- Reorder from history
- Quote management

## 💡 Tips for B2B Success

### Account Management
1. **Dedicated Reps**: Assign to key accounts
2. **Custom Catalogs**: Per-customer product lists
3. **Negotiated Pricing**: Store in customer metadata
4. **Order Templates**: Save frequent orders

### Compliance & Documentation
1. **Tax Exemption**: Track certificates
2. **Regulatory Docs**: Safety data sheets
3. **Audit Trail**: Complete order history
4. **Terms Acceptance**: Digital signatures

### Performance Optimization
1. **Bulk Operations**: Import/export large catalogs
2. **Quick Order**: SKU-based ordering
3. **Order Upload**: CSV/Excel support
4. **API Access**: For system integration

## 🔗 Related Documentation

- [Saleor B2B Recipe](https://docs.saleor.io/recipes/b2b)
- [Customer Groups](https://docs.saleor.io/developer/customers)
- [Pricing Rules](https://docs.saleor.io/developer/checkout/prices)
- [Payment Methods](https://docs.saleor.io/developer/payments)

## 🤝 Support

For questions about this recipe:
- [GitHub Issues](https://github.com/saleor/configurator/issues)
- [Discord Community](https://discord.gg/saleor)
- [Saleor Documentation](https://docs.saleor.io)