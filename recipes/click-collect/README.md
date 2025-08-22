# Click & Collect Recipe

Complete omnichannel configuration for buy online pickup in-store (BOPIS), curbside pickup, and seamless integration between online and physical retail locations.

## 🎯 Use Cases

- **Retail chains** with physical stores
- **Grocery stores** offering curbside pickup
- **Department stores** with omnichannel strategy
- **Quick service restaurants** (QSR)
- **Pharmacy chains** with drive-through
- **Big box retailers** with warehouse pickup
- **Shopping malls** with centralized pickup
- **Hybrid retail models**

## 🚀 Quick Start

```bash
# Initialize a click & collect store
npx @saleor/configurator init --recipe click-collect

# Or apply to existing configuration
npx @saleor/configurator apply --recipe click-collect

# Deploy to your Saleor instance
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📋 What's Included

### Channels Configuration

#### Online - Store Pickup
Primary channel for BOPIS orders:
- **Warehouses**: 5 store locations
- **Reservation**: 4 hours for authenticated users
- **Pickup Window**: 7 days
- **Payment**: Required at checkout
- **Options**: In-store, curbside, locker, express

#### Online - Delivery
Traditional e-commerce channel:
- **Warehouses**: Central warehouse, Regional DC
- **Strategy**: Prioritize high stock
- **Fulfillment**: Standard shipping

#### In-Store Only
POS and walk-in customers:
- **POS Integration**: Enabled
- **Cash Payments**: Accepted
- **Instant Fulfillment**: Yes

### Product Types

#### Retail Product
Standard retail items with:
- **Store Availability**: Multi-location tracking
- **Pickup Options**: Various pickup methods
- **Preparation Time**: Ready now to next day
- **Special Handling**: Fragile, temperature, age restrictions
- **Services**: Assembly, installation, gift wrap
- **Express Eligible**: 15-minute pickup

#### Grocery Product
Perishable goods configuration:
- **Temperature Control**: Refrigerated, frozen, room temp
- **Expiration Handling**: Same day to non-perishable
- **Substitutions**: Allow alternatives
- **Categories**: Produce, dairy, meat, bakery

### Key Features

#### Pickup Options
```yaml
- In-Store Pickup: Customer service desk
- Curbside Pickup: Designated parking spots
- Locker Pickup: Automated retrieval
- Express Counter: 15-minute service
- Drive-Through: Stay in vehicle
```

#### Preparation Times
- Ready Now (in stock)
- 15 minutes (express)
- 30 minutes to 2 hours
- Same day
- Next day

#### Store Services
- Gift wrapping
- Personal shopping
- Installation service
- Try before buy
- Returns desk

### Page Types

#### Store Location
Complete store information:
- **Details**: Name, address, phone, hours
- **Pickup Info**: Counter location, curbside spots
- **Accessibility**: Parking, wheelchair access
- **Services**: Special services offered
- **Staff**: Manager contact
- **Navigation**: GPS coordinates

#### Pickup Order
Order tracking and management:
- **Order Details**: Number, location, type
- **Customer Info**: Name, phone, vehicle
- **Status Tracking**: Pending to completed
- **Verification**: ID check, confirmation code
- **Special Handling**: Temperature items, signatures

### Categories

Store organization:
```
Available for Pickup/
├── Ready in 15 Minutes
├── Same Day Pickup
└── Next Day Pickup

Curbside Available/
├── Groceries
├── General Merchandise
└── Electronics

Store Departments/
├── Electronics (Floor 1, Section A)
├── Clothing (Floor 2, Section B)
├── Home & Garden (Floor 1, Section C)
└── Grocery (Floor 1, Section D)

Online Exclusive/
In-Store Only/
```

## 🔧 Customization Guide

### Adding Store Locations

Extend store network:

```yaml
warehouses:
  - "New Downtown Location"
  - "Strip Mall Store"
  - "University Campus"
```

### Configuring Pickup Times

Adjust preparation windows:

```yaml
- name: "Preparation Time"
  values:
    - name: "5 minutes"
      slug: 5-min
    - name: "While you wait"
      slug: instant
```

### Special Services

Add location-specific services:

```yaml
- name: "Special Services"
  values:
    - name: "Tech Support"
      slug: tech-support
    - name: "Product Demo"
      slug: demo
    - name: "Custom Orders"
      slug: custom
```

### Temperature Zones

For grocery/pharmacy:

```yaml
- name: "Temperature Controlled"
  values:
    - name: "Hot Food Ready"
      slug: hot-ready
    - name: "Medical Cold Chain"
      slug: medical-cold
```

## 🏗️ Implementation Best Practices

### Inventory Management

1. **Real-Time Sync**: Live inventory across channels
2. **Store Allocation**: Reserve stock for pickup
3. **Buffer Stock**: Prevent overselling
4. **Transfer Orders**: Inter-store movements
5. **Cycle Counts**: Regular accuracy checks

### Order Orchestration

1. **Order Routing**: Optimal location selection
2. **Queue Management**: Preparation priorities
3. **Status Updates**: Real-time notifications
4. **Time Slots**: Capacity management
5. **No-Show Handling**: Automatic cancellation

### Customer Communication

1. **Order Confirmation**: Immediate email/SMS
2. **Ready Notification**: When prepared
3. **Arrival Alert**: Check-in system
4. **Delays**: Proactive updates
5. **Pickup Reminders**: Prevent abandonment

### Store Operations

1. **Staff Training**: Pickup procedures
2. **Staging Areas**: Organized storage
3. **Express Lanes**: Quick pickup flow
4. **Curbside Process**: Efficient delivery
5. **Safety Protocols**: Contact-free options

## 📊 Recommended Extensions

### Technology Integration
- **Mobile App**: Check-in, notifications
- **Geofencing**: Automatic arrival detection
- **QR Codes**: Contactless verification
- **Digital Receipts**: Paperless pickup
- **Store Maps**: Indoor navigation

### Analytics & Reporting
- Pickup rate vs delivery
- Average preparation time
- Peak pickup hours
- No-show rates
- Store performance metrics
- Customer satisfaction scores

### Operational Tools
- Staff scheduling based on pickup volume
- Automated order assignment
- Inventory rebalancing
- Route optimization for curbside
- Capacity planning tools

## 💡 Tips for Success

### Customer Experience
1. **Clear Instructions**: Pickup process steps
2. **Multiple Channels**: Email, SMS, app notifications
3. **Flexible Windows**: Accommodate schedules
4. **Easy Check-in**: Multiple methods
5. **Quick Resolution**: Handle issues fast

### Operational Efficiency
1. **Batch Picking**: Group orders
2. **Zone Picking**: Organize by department
3. **Priority Queue**: Express vs standard
4. **Cross-Training**: Flexible staffing
5. **Performance Metrics**: Track and improve

### Marketing Opportunities
1. **Free Pickup**: Incentive over shipping
2. **Express Service**: Premium option
3. **Exclusive Items**: Pickup-only products
4. **Bundle Deals**: Encourage larger orders
5. **Loyalty Points**: Reward pickup choice

### Risk Management
1. **ID Verification**: Prevent fraud
2. **Order Limits**: Manage capacity
3. **Weather Protocols**: Curbside in bad weather
4. **Security Cameras**: Monitor pickup areas
5. **Insurance**: Liability coverage

## 🔗 Related Documentation

- [Saleor Click & Collect Recipe](https://docs.saleor.io/recipes/click-collect)
- [Warehouse Management](https://docs.saleor.io/developer/warehouses)
- [Channel Configuration](https://docs.saleor.io/developer/channels)
- [Order Fulfillment](https://docs.saleor.io/developer/orders)
- [Inventory Tracking](https://docs.saleor.io/developer/products/inventory)

## 🤝 Support

For questions about this recipe:
- [GitHub Issues](https://github.com/saleor/configurator/issues)
- [Discord Community](https://discord.gg/saleor)
- [Saleor Documentation](https://docs.saleor.io)