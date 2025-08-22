# Custom Shipping Recipe

Advanced shipping configuration with complex rules, multiple carriers, freight options, and specialized delivery services for sophisticated logistics operations.

## 🎯 Use Cases

- **Complex logistics operations**
- **Multi-carrier shipping strategies**
- **Freight and LTL shipping**
- **White glove delivery services**
- **Hazmat and special handling**
- **Zone-based pricing models**
- **B2B with custom shipping rules**
- **Marketplace with multiple fulfillment partners**

## 🚀 Quick Start

```bash
# Initialize a custom shipping configuration
npx @saleor/configurator init --recipe custom-shipping

# Or apply to existing configuration
npx @saleor/configurator apply --recipe custom-shipping

# Deploy to your Saleor instance
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📋 What's Included

### Channels Configuration

#### Standard Commerce
Regular e-commerce shipping:
- **Warehouses**: Main, East/West Coast DCs
- **Zones**: Domestic (Standard, Express, Economy), International
- **Strategy**: Optimized routing

#### Premium Service
High-touch delivery options:
- **Services**: White glove, same day, scheduled
- **Warehouses**: Premium fulfillment centers
- **Features**: Installation services

#### Bulk & Freight
Large shipment handling:
- **Minimum**: $1000 orders
- **Options**: LTL, FTL, ocean, rail
- **Terms**: NET payment available

### Product Shipping Attributes

#### Shipping Classes
Categorized handling requirements:
- **Standard**: Base rates apply
- **Oversized**: Dimensional surcharges
- **Fragile**: Insurance required
- **Hazmat**: Special handling fees
- **Perishable**: Expedited only
- **High Value**: Signature & insurance

#### Dimensional Details
- Package dimensions (LxWxH)
- Actual weight
- Dimensional weight calculation
- Orientation requirements
- Stackability

#### Carrier Specifications
- Carrier restrictions
- Service level availability
- Saturday/Sunday delivery
- Signature requirements
- Insurance options

### Freight Configuration

#### Freight Classes
NMFC classification system:
- Class 50-100 options
- Density-based pricing
- Special handling flags

#### Loading Requirements
- Liftgate service
- Forklift availability
- Loading dock access
- Inside delivery
- Residential delivery

### Key Features

#### Shipping Zones
```yaml
Zone Types:
- Domestic: US states, zip ranges
- International: Country groups
- Regional: Multi-state areas
- Metro: City-specific rates
```

#### Rate Calculation
- Flat rate
- Weight-based tiers
- Price-based thresholds
- Quantity breaks
- Real-time calculated

#### Special Services
- White glove delivery
- Scheduled delivery windows
- Installation services
- Assembly/unpacking
- Old item removal

### Page Types

#### Shipping Zone
Complete zone configuration:
- **Coverage**: Countries, states, zips
- **Rates**: Base rates and calculations
- **Rules**: Thresholds and surcharges
- **Timing**: Delivery estimates, cutoffs
- **Exclusions**: Product restrictions

#### Carrier Service
Carrier integration settings:
- **Provider**: FedEx, UPS, USPS, DHL
- **Services**: Ground to overnight
- **Credentials**: API configuration
- **Limits**: Weight and size maximums
- **Coverage**: Service areas

#### Shipping Rule
Business rule engine:
- **Conditions**: When rules apply
- **Actions**: Discounts, surcharges, upgrades
- **Priority**: Rule evaluation order
- **Schedule**: Date-based activation

### Categories

Shipping method organization:
```
Standard Shipping/
├── Small Parcel (up to 70 lbs)
├── Large Package (up to 150 lbs)
└── Envelope (up to 1 lb)

Express Shipping/
├── Next Day AM (10:30 AM delivery)
├── Next Day PM (3:00 PM delivery)
├── 2-Day
└── Same Day (metro only)

Freight Shipping/
├── LTL (150-15,000 lbs)
├── FTL (15,000+ lbs)
├── Flatbed
└── Refrigerated

Specialty Shipping/
├── White Glove
├── Medical/Pharmaceutical
├── Hazmat
└── Fine Art

International/
├── Economy (10-20 days)
├── Priority (6-10 days)
└── Express (1-3 days)
```

## 🔧 Customization Guide

### Adding Shipping Classes

Define new product shipping categories:

```yaml
- name: "Shipping Class"
  values:
    - name: "Lithium Battery"
      slug: lithium
      metadata:
        restricted_carriers: "USPS"
        documentation_required: "true"
```

### Zone Configuration

Create custom shipping zones:

```yaml
- name: "Zone Name"
  slug: west-coast
  states: "CA, OR, WA, NV, AZ"
  base_rate: 15
  free_threshold: 75
```

### Carrier Services

Add carrier-specific services:

```yaml
- name: "FedEx Custom Critical"
  slug: fedex-critical
  service_level: "Same Day"
  max_weight: 100
  tracking: "Real-time GPS"
```

### Rate Tables

Configure tiered pricing:

```yaml
Rate Table:
  0-1 lb: $8.99
  1-5 lbs: $12.99
  5-10 lbs: $18.99
  10-20 lbs: $24.99
  20+ lbs: $1.25/lb
```

## 🏗️ Implementation Best Practices

### Rate Management

1. **Zone Strategy**: Group by distance/cost
2. **Carrier Negotiation**: Volume discounts
3. **Rate Shopping**: Multi-carrier comparison
4. **Surcharge Management**: Fuel, residential, oversized
5. **Free Shipping Rules**: Strategic thresholds

### Carrier Integration

1. **API Setup**: Real-time rate quotes
2. **Label Generation**: Automated printing
3. **Tracking Updates**: Webhook integration
4. **Address Validation**: Reduce errors
5. **Insurance Claims**: Automated filing

### Freight Operations

1. **Classification**: Accurate NMFC codes
2. **Bill of Lading**: Automated generation
3. **Carrier Selection**: Based on lane
4. **Accessorial Charges**: Transparent pricing
5. **Proof of Delivery**: Digital capture

### International Shipping

1. **Customs Forms**: Automated generation
2. **Duty Calculation**: Landed cost display
3. **Restricted Items**: Country-specific rules
4. **Documentation**: Commercial invoices
5. **Tracking**: End-to-end visibility

## 📊 Recommended Extensions

### Analytics & Reporting
- Shipping cost analysis
- Carrier performance metrics
- Zone profitability reports
- Delivery time accuracy
- Damage/loss rates
- Cost per package trends

### Automation Tools
- **Rate Shopping**: Best rate selection
- **Smart Routing**: Optimal carrier/service
- **Batch Processing**: Bulk label printing
- **Exception Handling**: Automated recovery
- **Returns Management**: Label generation

### Integration Points
- **Carriers**: FedEx, UPS, USPS, DHL APIs
- **Freight**: FreightQuote, Freightview
- **Software**: ShipStation, EasyPost
- **WMS**: Warehouse management systems
- **ERP**: SAP, NetSuite, Dynamics

## 💡 Tips for Shipping Success

### Cost Optimization
1. **Dimensional Pricing**: Optimize packaging
2. **Zone Skipping**: Regional carriers
3. **Consolidation**: Combine shipments
4. **Negotiation**: Regular rate reviews
5. **Mode Selection**: Right service level

### Customer Experience
1. **Delivery Options**: Multiple choices
2. **Real-Time Rates**: Accurate quotes
3. **Tracking**: Proactive updates
4. **Delivery Windows**: Scheduled options
5. **Exceptions**: Clear communication

### Operational Excellence
1. **Pack Optimization**: Right-size boxes
2. **Label Accuracy**: Reduce corrections
3. **Cutoff Management**: Clear deadlines
4. **Damage Prevention**: Proper packaging
5. **Returns Process**: Simplified flow

### Compliance & Risk
1. **Hazmat Training**: Staff certification
2. **Insurance Coverage**: Adequate protection
3. **Documentation**: Complete records
4. **Regulatory Updates**: Stay current
5. **Carrier Liability**: Understand limits

## 🔗 Related Documentation

- [Saleor Custom Shipping Recipe](https://docs.saleor.io/recipes/custom-shipping)
- [Shipping Methods](https://docs.saleor.io/developer/shipping)
- [Shipping Zones](https://docs.saleor.io/developer/shipping/zones)
- [Weight Configuration](https://docs.saleor.io/developer/products/weight)
- [Webhook Events](https://docs.saleor.io/developer/extending/webhooks)

## 🤝 Support

For questions about this recipe:
- [GitHub Issues](https://github.com/saleor/configurator/issues)
- [Discord Community](https://discord.gg/saleor)
- [Saleor Documentation](https://docs.saleor.io)