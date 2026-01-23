---
name: product-modeling
version: 2.0.0
description: This skill should be used when the user asks "how do I model my products?", "what attributes should I use?", "product vs variant attributes", "when to use dropdown vs multiselect", "how to structure my product types", "attribute type selection", "variant matrix design", "when to use Models vs Attributes", "how to create custom entities", "Categories vs Collections", "navigation structure", "Structures (Menus)", or needs guidance on designing their Saleor catalog. Provides decision frameworks for products, Models (Pages), Structures (Menus), Categories, and Collections.
---

# Saleor Domain Modeling

Guide users through designing their complete catalog structure in Saleor. This skill provides decision frameworks for:

1. **Products** - ProductTypes, Attributes, Variants
2. **Models (Pages)** - Custom entities beyond products
3. **Categories** - Hierarchical product organization
4. **Collections** - Curated product groupings
5. **Structures (Menus)** - Navigation and curated hierarchies

## The Complete Entity Hierarchy

Understanding how Saleor entities relate is essential for good modeling:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SALEOR DOMAIN MODEL                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ATTRIBUTES (Building Blocks)                                        │
│  ├── Reusable typed fields                                          │
│  ├── Assigned to ProductTypes OR PageTypes (Models)                 │
│  └── Types: DROPDOWN, SWATCH, MULTISELECT, REFERENCE, etc.          │
│                                                                      │
│  ┌──────────────────────┐     ┌──────────────────────┐              │
│  │    PRODUCT SIDE      │     │     MODEL SIDE       │              │
│  ├──────────────────────┤     ├──────────────────────┤              │
│  │                      │     │                      │              │
│  │  ProductType         │     │  PageType (ModelType)│              │
│  │  (template/schema)   │     │  (template/schema)   │              │
│  │       │              │     │       │              │              │
│  │       ▼              │     │       ▼              │              │
│  │  Product             │     │  Page (Model)        │              │
│  │  (instance)          │◄────┤  (instance)          │              │
│  │       │              │ REF │                      │              │
│  │       ▼              │     │  Examples:           │              │
│  │  Variant[]           │     │  - Brands            │              │
│  │  (purchasable SKUs)  │     │  - Scent Profiles    │              │
│  │                      │     │  - Ingredients       │              │
│  └──────────────────────┘     └──────────────────────┘              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    ORGANIZATION                                │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                                │   │
│  │  Category (hierarchical)    Collection (flat)                  │   │
│  │  ├── Parent/Child tree      ├── Curated groups                 │   │
│  │  ├── 1 product = 1 category ├── 1 product = N collections      │   │
│  │  └── Navigation, SEO        └── Promotions, campaigns          │   │
│  │                                                                │   │
│  │  Structure (Menu)                                              │   │
│  │  ├── Links to: Categories, Collections, Models, URLs           │   │
│  │  ├── Hierarchical (nested items)                               │   │
│  │  └── Navigation, curated guides, feature sections              │   │
│  │                                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## The Core Flow: Attributes → ProductTypes → Products → Variants

This is the most important relationship to understand:

```
1. ATTRIBUTES (define fields)
   └── Create reusable typed fields: Size (DROPDOWN), Color (SWATCH), Brand (DROPDOWN)

2. PRODUCT TYPES (define structure)
   └── Assign attributes to ProductType:
       ├── productAttributes: Brand, Material (same for all variants)
       └── variantAttributes: Size, Color (create SKU combinations)

3. PRODUCTS (create items)
   └── Create product using ProductType:
       ├── Set product attribute VALUES: Brand="Nike", Material="Cotton"
       └── Define variants with SKU combinations

4. VARIANTS (purchasable SKUs)
   └── Each unique combination = 1 variant:
       ├── SKU: "TSHIRT-BLK-M" → Size="M", Color="Black", Price=$29.99
       └── SKU: "TSHIRT-WHT-L" → Size="L", Color="White", Price=$29.99
```

**Key insight:** Attributes are building blocks. ProductTypes assemble them into templates. Products are instances. Variants are what customers buy.

## Decision Framework: Product vs Variant Attributes

This is the most critical modeling decision. Ask these questions:

### Use Product-Level Attributes When:

| Question | If YES → Product Level |
|----------|------------------------|
| Is this value the SAME for all sizes/colors? | Brand, Material, Manufacturer |
| Is this descriptive information? | Care Instructions, Description, Specifications |
| Would changing this require a new product entirely? | Collection Year, Model Name |
| Is this for filtering/categorization only? | Style, Gender, Season |

### Use Variant-Level Attributes When:

| Question | If YES → Variant Level |
|----------|------------------------|
| Does this create a SEPARATE purchasable item? | Size, Color, Storage Capacity |
| Does this affect PRICE? | Size (XL costs more), Material quality tier |
| Does this affect INVENTORY tracking? | Each Size needs separate stock count |
| Can customers SELECT this at checkout? | Color picker, Size selector |

### Quick Decision Matrix

| Attribute | Product Level | Variant Level | Reasoning |
|-----------|:-------------:|:-------------:|-----------|
| Brand | ✓ | | Same for all variants |
| Size | | ✓ | Creates separate SKUs |
| Color | | ✓ | Creates separate SKUs |
| Material | ✓ | | Usually same for product |
| Storage (64GB/128GB) | | ✓ | Different prices, separate SKUs |
| Care Instructions | ✓ | | Same for all variants |
| Weight | | ✓ | May differ per size |
| Warranty Period | ✓ | | Same for all variants |

## Attribute Type Selection Guide

Saleor supports 12 attribute input types. Select based on data characteristics:

### Selection Attributes (User picks from options)

| Type | Use When | Example |
|------|----------|---------|
| **DROPDOWN** | Single choice from predefined list | Size: S, M, L, XL |
| **MULTISELECT** | Multiple choices allowed | Features: Bluetooth, WiFi, GPS |
| **SWATCH** | Color/pattern with visual preview | Color: Red (#FF0000), Blue (#0000FF) |
| **BOOLEAN** | Yes/No toggle | Is Organic: true/false |

### Text Attributes (Free-form input)

| Type | Use When | Example |
|------|----------|---------|
| **PLAIN_TEXT** | Short text, no formatting | Model Number: "ABC-123" |
| **RICH_TEXT** | Long text with formatting | Description with bold, lists, links |

### Numeric Attributes

| Type | Use When | Example |
|------|----------|---------|
| **NUMERIC** | Numbers with units | Weight: 250g, Screen: 6.5 inches |

### Date Attributes

| Type | Use When | Example |
|------|----------|---------|
| **DATE** | Date only | Release Date: 2024-01-15 |
| **DATE_TIME** | Date and time | Launch Time: 2024-01-15T09:00:00 |

### Special Attributes

| Type | Use When | Example |
|------|----------|---------|
| **FILE** | Document/media attachment | Manual PDF, Spec Sheet |
| **REFERENCE** | Link to another entity | Related Products, Brand Page |

### Type Selection Decision Tree

```
Is it a CHOICE from predefined options?
├── YES: Can user select MULTIPLE?
│   ├── YES → MULTISELECT
│   └── NO: Is it a COLOR/PATTERN?
│       ├── YES → SWATCH
│       └── NO: Is it YES/NO only?
│           ├── YES → BOOLEAN
│           └── NO → DROPDOWN
└── NO: Is it a NUMBER with units?
    ├── YES → NUMERIC
    └── NO: Is it a DATE?
        ├── YES: Need time too?
        │   ├── YES → DATE_TIME
        │   └── NO → DATE
        └── NO: Is it long formatted text?
            ├── YES → RICH_TEXT
            └── NO: Is it a file/document?
                ├── YES → FILE
                └── NO: Link to another entity?
                    ├── YES → REFERENCE
                    └── NO → PLAIN_TEXT
```

## Variant Matrix Planning

Before creating variants, calculate the SKU explosion:

```
SKU Count = Value1 × Value2 × Value3 × ...

Example: T-Shirt
- Sizes: XS, S, M, L, XL, XXL (6 values)
- Colors: Black, White, Navy, Gray, Red (5 values)
- SKUs: 6 × 5 = 30 variants per product
```

### Variant Count Guidelines

| SKU Count | Assessment | Recommendation |
|-----------|------------|----------------|
| 1-10 | Manageable | Good for most products |
| 11-50 | Moderate | Acceptable for fashion, requires inventory management |
| 51-100 | High | Consider splitting into multiple products |
| 100+ | Very High | Likely over-dimensioned, simplify |

### Strategies for High Variant Counts

1. **Split by Product Line**: Instead of 1 product with 100 SKUs, create 5 products with 20 SKUs each
2. **Reduce Dimensions**: Not every color needs every size
3. **Use Product Attributes**: Move non-purchasable attributes to product level
4. **Custom Options**: For truly custom products, consider made-to-order workflows

## Common Product Modeling Patterns

### Pattern 1: Apparel (Fashion Store)

```yaml
productTypes:
  - name: "T-Shirt"
    productAttributes:
      - name: "Brand"           # Same for all variants
        type: DROPDOWN
      - name: "Material"        # Same for all variants
        type: DROPDOWN
        values: ["100% Cotton", "Cotton Blend", "Organic Cotton"]
      - name: "Care Instructions"
        type: RICH_TEXT
    variantAttributes:
      - name: "Size"            # Creates SKUs
        type: DROPDOWN
        values: ["XS", "S", "M", "L", "XL", "XXL"]
      - name: "Color"           # Creates SKUs
        type: SWATCH
```

**Why this works:**
- Brand/Material are descriptive (product level)
- Size/Color are selectable options that affect inventory (variant level)
- 6 sizes × 5 colors = 30 SKUs max per product

### Pattern 2: Electronics (Tech Store)

```yaml
productTypes:
  - name: "Smartphone"
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Screen Size"     # Specs, same for all variants
        type: PLAIN_TEXT
      - name: "Processor"
        type: PLAIN_TEXT
      - name: "Features"        # Multiple can apply
        type: MULTISELECT
        values: ["5G", "Wireless Charging", "Water Resistant", "Face ID"]
    variantAttributes:
      - name: "Storage"         # Affects price significantly
        type: DROPDOWN
        values: ["64GB", "128GB", "256GB", "512GB", "1TB"]
      - name: "Color"
        type: SWATCH
```

**Why this works:**
- Technical specs shared across variants (product level)
- Storage affects price and is user choice (variant level)
- 5 storage × 4 colors = 20 SKUs max per product

### Pattern 3: Furniture (Home Store)

```yaml
productTypes:
  - name: "Sofa"
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Style"
        type: DROPDOWN
        values: ["Modern", "Traditional", "Scandinavian", "Industrial"]
      - name: "Seating Capacity"
        type: DROPDOWN
        values: ["2-Seater", "3-Seater", "L-Shaped", "Sectional"]
      - name: "Dimensions"
        type: PLAIN_TEXT
    variantAttributes:
      - name: "Fabric"          # Affects price and availability
        type: DROPDOWN
        values: ["Linen", "Velvet", "Leather", "Performance Fabric"]
      - name: "Color"
        type: SWATCH
```

**Why this works:**
- Style and capacity define the product (product level)
- Fabric and color are customizable options (variant level)
- Keep variants manageable by limiting fabric/color combos

### Pattern 4: Food & Beverage

```yaml
productTypes:
  - name: "Coffee Beans"
    productAttributes:
      - name: "Origin"
        type: DROPDOWN
        values: ["Ethiopia", "Colombia", "Brazil", "Guatemala"]
      - name: "Roast Level"
        type: DROPDOWN
        values: ["Light", "Medium", "Dark"]
      - name: "Flavor Notes"
        type: MULTISELECT
        values: ["Fruity", "Nutty", "Chocolate", "Floral", "Spicy"]
      - name: "Certifications"
        type: MULTISELECT
        values: ["Organic", "Fair Trade", "Rainforest Alliance"]
    variantAttributes:
      - name: "Size"            # Bag size affects price
        type: DROPDOWN
        values: ["250g", "500g", "1kg"]
      - name: "Grind"           # Affects processing
        type: DROPDOWN
        values: ["Whole Bean", "Espresso", "Filter", "French Press"]
```

**Why this works:**
- Origin, roast, flavor describe the coffee (product level)
- Size and grind are purchasable options (variant level)
- 3 sizes × 4 grinds = 12 SKUs max per product

### Pattern 5: Digital Products

```yaml
productTypes:
  - name: "Software License"
    isShippingRequired: false   # Digital product
    productAttributes:
      - name: "Publisher"
        type: DROPDOWN
      - name: "Platform"
        type: MULTISELECT
        values: ["Windows", "macOS", "Linux", "iOS", "Android"]
      - name: "Features"
        type: RICH_TEXT
    variantAttributes:
      - name: "License Type"    # Affects price
        type: DROPDOWN
        values: ["Personal", "Business", "Enterprise"]
      - name: "Duration"        # Subscription term
        type: DROPDOWN
        values: ["Monthly", "Annual", "Lifetime"]
```

**Why this works:**
- No shipping required for digital
- Platform compatibility is informational (product level)
- License type and duration affect pricing (variant level)

## Common Modeling Mistakes

### Mistake 1: Over-Dimensioning Variants

**Wrong:**
```yaml
variantAttributes:
  - Size (6 values)
  - Color (10 values)
  - Material (4 values)
  - Style (3 values)
# Result: 6 × 10 × 4 × 3 = 720 SKUs!
```

**Right:**
- Move Material and Style to product level
- Create separate products for different materials/styles
- Result: 6 × 10 = 60 SKUs per product

### Mistake 2: Variant Attributes Without Inventory Impact

**Wrong:** Using "Care Instructions" as variant attribute
**Why wrong:** Care instructions don't create separate SKUs
**Right:** Move to product attribute (RICH_TEXT type)

### Mistake 3: Product Attributes That Should Vary

**Wrong:** "Weight" as product attribute for clothing
**Why wrong:** XL weighs more than S
**Right:** Move to variant attribute (NUMERIC type)

## Workflow: Designing a New Product Type

Follow this process to design product types:

1. **List all product characteristics** - Write down every field/attribute needed
2. **Categorize each** - Apply the decision framework (product vs variant)
3. **Select types** - Use the type selection decision tree
4. **Calculate SKU count** - Ensure variant matrix is manageable
5. **Create ProductType** - Write the YAML configuration
6. **Validate** - Run `/configurator-validate` to check structure

---

## Categories vs Collections: Decision Framework

Both organize products, but serve different purposes:

| Aspect | Category | Collection |
|--------|----------|------------|
| **Structure** | Hierarchical (tree) | Flat (list) |
| **Product assignment** | 1 product → 1 category | 1 product → N collections |
| **Purpose** | Taxonomy, navigation | Merchandising, promotions |
| **SEO** | Main site structure | Landing pages, campaigns |
| **Examples** | Electronics → Phones → Smartphones | "Summer Sale", "New Arrivals" |

### Use Categories When:
- Building main site navigation
- Creating browse/filter structure
- Defining product taxonomy (what IS this product?)
- SEO-driven URL structure (/electronics/phones/smartphones)

### Use Collections When:
- Curating products across categories
- Running promotions or campaigns
- Creating temporary groupings
- Marketing-driven groupings ("Bestsellers", "Gift Ideas")

### Category Hierarchy Best Practices

```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    children:
      - name: "Phones"
        slug: "phones"
        children:
          - name: "Smartphones"        # Max 3-4 levels deep
            slug: "smartphones"
```

**Depth guidelines:**
- Level 1: Major departments (Electronics, Clothing, Home)
- Level 2: Categories (Phones, Laptops, Accessories)
- Level 3: Subcategories (Smartphones, Feature Phones)
- Level 4: Rarely needed, consider using Collections instead

---

## Models (Pages): When to Use Custom Entities

Models extend Saleor beyond Products. Use them for structured data that isn't purchasable.

### When to Use Models vs Product Attributes

| Use Case | Use Model | Use Product Attribute |
|----------|:---------:|:---------------------:|
| Shared across many products | ✓ | |
| Has its own detailed attributes | ✓ | |
| Needs its own page/content | ✓ | |
| Simple value selection | | ✓ |
| Only used on one product type | | ✓ |
| No additional data beyond name | | ✓ |

### Model Use Cases

**Brands:**
```yaml
pageTypes:
  - name: "Brand"
    attributes:
      - name: "Logo"
        type: FILE
      - name: "Description"
        type: RICH_TEXT
      - name: "Website"
        type: PLAIN_TEXT
      - name: "Country"
        type: DROPDOWN

models:
  - title: "Nike"
    slug: "nike"
    pageType: "Brand"
    attributes:
      Logo: "nike-logo.png"
      Description: "Just Do It..."
      Country: "USA"
```

Then link from Products using REFERENCE attribute:
```yaml
productTypes:
  - name: "Sneakers"
    productAttributes:
      - name: "Brand"
        type: REFERENCE
        entityType: PAGE  # Links to Brand model
```

**Scent Profiles (Perfume Store):**
```yaml
pageTypes:
  - name: "Scent Profile"
    attributes:
      - name: "Scent Family"
        type: DROPDOWN
        values: ["Citrus", "Woody", "Floral", "Oriental"]
      - name: "Notes Description"
        type: RICH_TEXT
      - name: "Intensity"
        type: DROPDOWN
        values: ["Light", "Medium", "Strong"]

models:
  - title: "Citrus Zest"
    slug: "citrus-zest"
    pageType: "Scent Profile"
    attributes:
      Scent Family: "Citrus"
      Notes Description: "Bright and zesty..."
      Intensity: "Light"
```

**Ingredients (Food/Cosmetics):**
```yaml
pageTypes:
  - name: "Ingredient"
    attributes:
      - name: "Scientific Name"
        type: PLAIN_TEXT
      - name: "Benefits"
        type: MULTISELECT
        values: ["Moisturizing", "Anti-Aging", "Brightening"]
      - name: "Allergen"
        type: BOOLEAN
      - name: "Description"
        type: RICH_TEXT
```

### Model Decision Tree

```
Is this data shared across multiple products?
├── NO → Use Product Attribute
└── YES: Does it need its own attributes/fields?
    ├── NO → Use DROPDOWN attribute with values
    └── YES: Does it need rich content/its own page?
        ├── NO → Consider DROPDOWN, might be overengineering
        └── YES → Create Model (PageType + Page)
```

---

## Structures (Menus): Navigation and Curated Hierarchies

Structures assemble Categories, Collections, Models, and URLs into hierarchies.

### When to Use Structures

| Use Case | Structure Type | Example |
|----------|----------------|---------|
| Main navigation | Header Menu | Home, Shop, About |
| Footer links | Footer Menu | Support, Legal, Social |
| Curated guides | Content Structure | "Home Office Setup Guide" |
| Category browsing | Mega Menu | Department → Category → Subcategory |

### Structure Configuration

```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        category: "shop"                    # Links to category
        children:
          - name: "New Arrivals"
            collection: "new-arrivals"      # Links to collection
          - name: "Electronics"
            category: "electronics"
          - name: "Clothing"
            category: "clothing"
      - name: "Brands"
        url: "/brands"                      # Links to URL
        children:
          - name: "Nike"
            page: "nike"                    # Links to Model (Page)
          - name: "Adidas"
            page: "adidas"
      - name: "About"
        page: "about-us"                    # Links to content page
```

### Curated Guide Pattern

```yaml
# Example: Home Office Setup Guide
menus:
  - name: "Home Office Setup Guide"
    slug: "home-office-guide"
    items:
      - name: "Ergonomics Tips"
        page: "ergonomics-tips"             # Model with advice
      - name: "Recommended Monitors"
        category: "monitors"                # Category
      - name: "Networking"
        children:
          - name: "WiFi Basics"
            page: "wifi-basics"             # Model
          - name: "Routers"
            category: "routers"             # Category
      - name: "Office Bundles"
        collection: "office-bundles"        # Collection
```

This creates a curated hierarchy mixing content (Models), products (Categories), and promotions (Collections).

---

## Complete Modeling Workflow

When designing a new store's data model:

1. **List all concepts** - Products, custom entities, organizational needs
2. **Identify products** - What can customers buy?
3. **Identify custom entities** - Brands, ingredients, profiles (→ Models)
4. **Design product structure** - ProductTypes with attributes
5. **Link entities** - REFERENCE attributes between Products and Models
6. **Organize catalog** - Categories (taxonomy) + Collections (merchandising)
7. **Build navigation** - Structures linking everything together

---

## Additional Resources

### Reference Files

For detailed patterns and implementation guidance:
- **`reference/attribute-types-deep-dive.md`** - Complete attribute type reference
- **`reference/industry-patterns.md`** - Patterns for 10+ industries
- **`reference/models-and-structures.md`** - Complete Models & Structures guide

### Examples

Working configuration examples:
- **`examples/fashion-product-types.yml`** - Apparel product types
- **`examples/electronics-product-types.yml`** - Tech product structures
- **`examples/perfume-store-models.yml`** - Models for custom entities
- **`examples/navigation-structures.yml`** - Menu/Structure configurations

### Related Skills

- **`configurator-schema`** - Complete YAML schema reference
- **`saleor-domain`** - Entity relationships and Saleor concepts
- **`configurator-recipes`** - Complete store templates
