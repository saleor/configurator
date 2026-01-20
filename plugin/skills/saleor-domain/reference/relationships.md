# Saleor Entity Relationships

Visual and textual documentation of entity relationships and dependencies.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CHANNEL                                         │
│  ┌─────────┐                                                                │
│  │ Channel │ ─────────────────────────────────────────────────────────┐     │
│  └────┬────┘                                                          │     │
│       │                                                               │     │
│       │ controls visibility, pricing, availability                    │     │
│       ▼                                                               │     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │     │
│  │ ProductListing  │    │ VariantListing  │    │CollectionListing│   │     │
│  │ - isPublished   │    │ - price         │    │ - isPublished   │   │     │
│  │ - visibleIn...  │    │ - costPrice     │    └─────────────────┘   │     │
│  └─────────────────┘    └─────────────────┘                          │     │
└──────────────────────────────────────────────────────────────────────┼─────┘
                                                                       │
┌──────────────────────────────────────────────────────────────────────┼─────┐
│                           PRODUCT STRUCTURE                          │     │
│                                                                      │     │
│  ┌─────────────┐         ┌───────────┐         ┌──────────┐         │     │
│  │ ProductType │◄────────│  Product  │────────►│ Category │         │     │
│  │             │         │           │         │          │         │     │
│  │ - name      │ type    │ - name    │ belongs │ - name   │         │     │
│  │ - attrs     │         │ - slug    │   to    │ - slug   │         │     │
│  └──────┬──────┘         │ - desc    │         │ - parent │         │     │
│         │                └─────┬─────┘         └──────────┘         │     │
│         │                      │                                     │     │
│    has attributes              │ has variants                        │     │
│         │                      │                                     │     │
│         ▼                      ▼                                     │     │
│  ┌──────────────┐       ┌─────────────┐       ┌────────────┐        │     │
│  │  Attribute   │◄──────│   Variant   │──────►│   Stock    │        │     │
│  │              │       │             │       │            │        │     │
│  │ - name       │ values│ - sku       │ stock │ - quantity │        │     │
│  │ - type       │       │ - attrs     │  at   │ - warehouse│        │     │
│  │ - values     │       └─────────────┘       └──────┬─────┘        │     │
│  └──────────────┘                                    │              │     │
│                                                      │              │     │
└──────────────────────────────────────────────────────┼──────────────┼─────┘
                                                       │              │
┌──────────────────────────────────────────────────────┼──────────────┼─────┐
│                          FULFILLMENT                 │              │     │
│                                                      ▼              │     │
│  ┌──────────────┐       ┌─────────────┐       ┌───────────┐        │     │
│  │ShippingZone  │◄──────│  Warehouse  │──────►│  Address  │        │     │
│  │              │       │             │       │           │        │     │
│  │ - name       │ ships │ - name      │ loc   │ - street  │        │     │
│  │ - countries  │ from  │ - slug      │       │ - city    │        │     │
│  │ - methods    │       │ - email     │       │ - country │        │     │
│  └──────┬───────┘       └─────────────┘       └───────────┘        │     │
│         │                                                           │     │
│    has methods                                                      │     │
│         │                                                           │     │
│         ▼                                                           │     │
│  ┌───────────────┐      ┌─────────────┐                            │     │
│  │ShippingMethod │─────►│MethodListing│◄────────────────────────────┘     │
│  │               │      │             │    channel pricing                │
│  │ - name        │      │ - price     │                                   │
│  │ - type        │      │ - channel   │                                   │
│  └───────────────┘      └─────────────┘                                   │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                              NAVIGATION                                    │
│                                                                           │
│  ┌────────┐         ┌───────────┐         ┌────────────┐                 │
│  │  Menu  │────────►│ MenuItem  │────────►│  Category  │                 │
│  │        │         │           │    or   │ Collection │                 │
│  │ - name │  items  │ - name    │    or   │   Page     │                 │
│  │ - slug │         │ - children│    or   │   URL      │                 │
│  └────────┘         └───────────┘         └────────────┘                 │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                                 TAX                                        │
│                                                                           │
│  ┌──────────┐       ┌───────────┐                                        │
│  │ TaxClass │──────►│  TaxRate  │                                        │
│  │          │       │           │                                        │
│  │ - name   │ rates │ - country │                                        │
│  └────┬─────┘       │ - rate %  │                                        │
│       │             └───────────┘                                        │
│       │                                                                   │
│  assigned to                                                              │
│       │                                                                   │
│       ▼                                                                   │
│  ┌─────────────┐                                                         │
│  │ ProductType │                                                         │
│  └─────────────┘                                                         │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Dependency Order

Entities must be created in dependency order:

### Level 0: Independent Entities

These have no dependencies on other entities:

```
┌────────────┐  ┌─────────┐  ┌───────────┐  ┌──────────┐
│    Shop    │  │ Channel │  │  TaxClass │  │ PageType │
└────────────┘  └─────────┘  └───────────┘  └──────────┘
```

### Level 1: Basic Dependencies

Depend only on Level 0 entities:

```
┌─────────────┐  ┌───────────────┐  ┌───────────┐
│ ProductType │  │ ShippingZone  │  │ Attribute │
│ (→TaxClass) │  │ (→countries)  │  │           │
└─────────────┘  └───────────────┘  └───────────┘
```

### Level 2: Structural Entities

Depend on Level 0-1 entities:

```
┌──────────┐  ┌───────────┐  ┌───────────────┐
│ Category │  │ Warehouse │  │ ShippingMethod│
│  (tree)  │  │(→ShipZone)│  │ (→ShipZone)   │
└──────────┘  └───────────┘  └───────────────┘
```

### Level 3: Content Entities

Depend on Level 0-2 entities:

```
┌────────────┐  ┌────────┐
│ Collection │  │  Page  │
│ (→Channel) │  │(→Type) │
└────────────┘  └────────┘
```

### Level 4: Product Entities

Depend on multiple lower-level entities:

```
┌─────────────────────────────────────────────────┐
│                    Product                       │
│  → ProductType                                   │
│  → Category                                      │
│  → Channel (listings)                            │
│  → Attribute values                              │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│                    Variant                       │
│  → Product                                       │
│  → Attribute values                              │
│  → Channel (pricing)                             │
│  → Warehouse (stock)                             │
└─────────────────────────────────────────────────┘
```

### Level 5: Navigation

Depends on all content entities:

```
┌─────────────────────────────────────────────────┐
│                      Menu                        │
│  → Category                                      │
│  → Collection                                    │
│  → Page                                          │
│  → External URLs                                 │
└─────────────────────────────────────────────────┘
```

## Reference Resolution

How references are resolved in config.yml:

### By Slug

```yaml
# Product references Category by slug path
products:
  - slug: "my-product"
    category: "electronics/phones"  # → Category.slug

# Variant references Warehouse by slug
variants:
  - stocks:
      - warehouse: "main-warehouse"  # → Warehouse.slug

# Channel listing by slug
channelListings:
  - channel: "us-store"  # → Channel.slug
```

### By Name

```yaml
# Product references ProductType by name
products:
  - productType: "T-Shirt"  # → ProductType.name

# ProductType references TaxClass by name
productTypes:
  - taxClass: "Standard Rate"  # → TaxClass.name

# Attribute assignment by name
productAttributes:
  - name: "Color"  # → Attribute.name
```

## Cascade Effects

Understanding what happens when entities change:

### Delete Channel

- Product listings in that channel are removed
- Collection listings are removed
- Shipping method prices are removed
- Active checkouts may fail

### Delete ProductType

- All products of that type become orphaned
- Cannot create new products with that type
- Existing products may error on update

### Delete Category

- Products in that category become uncategorized
- Child categories are deleted (cascade)
- Menu items pointing to category break

### Delete Attribute

- Product type attribute assignments are removed
- Existing attribute values on products remain but orphaned
- Variant attribute values may cause issues

### Delete Warehouse

- Stock records are removed
- Shipping zones lose warehouse association
- Fulfillment may fail

## Common Patterns

### Multi-Tenant (Channels)

```
Channel A ──┬── Product Listing A (visible, $10)
            │
Product ────┼── Product Listing B (hidden)
            │
Channel B ──┴── Product Listing C (visible, €8)
```

### Variant Matrix

```
ProductType "Shirt"
├── Variant Attribute: Size (S, M, L)
└── Variant Attribute: Color (Red, Blue)

Product "Basic Shirt"
├── Variant: SKU-S-RED (Size=S, Color=Red)
├── Variant: SKU-S-BLUE (Size=S, Color=Blue)
├── Variant: SKU-M-RED (Size=M, Color=Red)
├── Variant: SKU-M-BLUE (Size=M, Color=Blue)
├── Variant: SKU-L-RED (Size=L, Color=Red)
└── Variant: SKU-L-BLUE (Size=L, Color=Blue)
```

### Fulfillment Flow

```
Order
  ↓
ShippingZone (by delivery country)
  ↓
Warehouse (by zone assignment)
  ↓
Stock (decrement quantity)
  ↓
ShippingMethod (calculate rate)
```
