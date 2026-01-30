# Attribute Types Deep Dive

Complete reference for all Saleor attribute input types with detailed configuration options.

## DROPDOWN

**Purpose:** Single selection from predefined options.

**Best for:** Size, Material, Brand, Category-like selections

**Configuration:**
```yaml
- name: "Size"
  type: DROPDOWN
  values:
    - name: "S"
    - name: "M"
    - name: "L"
    - name: "XL"
  visibleInStorefront: true      # Show on product page
  filterableInStorefront: true   # Enable filter in catalog
  filterableInDashboard: true    # Enable filter in admin
```

**Variant Selection:** When used as variantAttribute, mark as variant selection to create purchasable options.

**When NOT to use:**
- Multiple selections needed → use MULTISELECT
- Color with visual preview → use SWATCH
- Simple yes/no → use BOOLEAN

---

## MULTISELECT

**Purpose:** Multiple selections from predefined options.

**Best for:** Features, Certifications, Compatibility, Tags

**Configuration:**
```yaml
- name: "Features"
  type: MULTISELECT
  values:
    - name: "Waterproof"
    - name: "Bluetooth"
    - name: "GPS"
    - name: "Heart Rate Monitor"
  visibleInStorefront: true
  filterableInStorefront: true
```

**Use cases:**
- Product features: "WiFi, Bluetooth, NFC"
- Certifications: "Organic, Fair Trade, Non-GMO"
- Compatibility: "iPhone, Android, Windows"
- Allergens: "Contains Nuts, Dairy-Free, Gluten-Free"

**Important:** MULTISELECT is typically product-level only. Using as variant attribute creates complex SKU matrices.

---

## SWATCH

**Purpose:** Color or pattern selection with visual preview.

**Best for:** Colors, Patterns, Finishes

**Configuration:**
```yaml
- name: "Color"
  type: SWATCH
  values:
    - name: "Midnight Black"
      value: "#000000"
    - name: "Arctic White"
      value: "#FFFFFF"
    - name: "Ocean Blue"
      value: "#0066CC"
    - name: "Forest Green"
      value: "#228B22"
```

**Value formats:**
- Hex color: `#FF5733`
- Image URL: `https://cdn.example.com/patterns/stripe.jpg`

**Storefront display:** Renders as color circles or pattern thumbnails for visual selection.

**Best practice:** Use descriptive names ("Midnight Black" not just "Black") for accessibility and SEO.

---

## BOOLEAN

**Purpose:** Yes/No or True/False toggle.

**Best for:** Binary features, flags, certifications

**Configuration:**
```yaml
- name: "Is Organic"
  type: BOOLEAN
  visibleInStorefront: true
  filterableInStorefront: true
```

**Use cases:**
- Is Organic: true/false
- Gift Wrapping Available: true/false
- Fragile Item: true/false
- Contains Alcohol: true/false

**Storefront display:** Checkbox or toggle switch.

---

## PLAIN_TEXT

**Purpose:** Short, unformatted text.

**Best for:** Model numbers, short specifications, identifiers

**Configuration:**
```yaml
- name: "Model Number"
  type: PLAIN_TEXT
  visibleInStorefront: true
```

**Use cases:**
- Model Number: "ABC-123-XYZ"
- Manufacturer Part Number: "MPN-2024-001"
- ISBN: "978-0-123456-78-9"
- Dimensions: "10 x 5 x 2 inches"

**Character limit:** No strict limit, but keep short for usability.

**When NOT to use:**
- Long text with formatting → use RICH_TEXT
- Numbers with units that need calculation → use NUMERIC

---

## RICH_TEXT

**Purpose:** Long-form text with formatting (bold, lists, links).

**Best for:** Descriptions, instructions, specifications

**Configuration:**
```yaml
- name: "Care Instructions"
  type: RICH_TEXT
  visibleInStorefront: true
```

**Supports:** Bold, italic, bullet lists, numbered lists, links, headings

**Format:** Stored as EditorJS JSON structure.

**Use cases:**
- Care Instructions
- Detailed Specifications
- Usage Guidelines
- Warranty Information

**Note:** Always product-level. Never use as variant attribute.

---

## NUMERIC

**Purpose:** Numbers with optional units.

**Best for:** Measurements, quantities, ratings

**Configuration:**
```yaml
- name: "Weight"
  type: NUMERIC
  unit: G                        # Grams
  visibleInStorefront: true
  filterableInStorefront: true   # Enable range filters
```

**Available units:**
| Category | Units |
|----------|-------|
| Mass | G (gram), KG (kilogram), LB (pound), OZ (ounce) |
| Length | CM (centimeter), M (meter), INCH, FT (foot) |
| Volume | ML (milliliter), L (liter), FL_OZ, GALLON |
| Area | SQ_M, SQ_FT, SQ_CM |

**Storefront filtering:** Enables range sliders (e.g., "Weight: 100g - 500g").

**Use cases:**
- Weight: 250 (unit: G)
- Screen Size: 6.5 (unit: INCH)
- Volume: 500 (unit: ML)
- Rating: 4.5 (no unit)

---

## DATE

**Purpose:** Date without time component.

**Best for:** Release dates, expiration dates, vintage years

**Configuration:**
```yaml
- name: "Release Date"
  type: DATE
  visibleInStorefront: true
```

**Format:** ISO 8601 date (YYYY-MM-DD)

**Use cases:**
- Release Date: "2024-01-15"
- Harvest Year: "2023-09-01"
- Expiration Date: "2025-12-31"

---

## DATE_TIME

**Purpose:** Date with time component.

**Best for:** Events, launches, time-sensitive products

**Configuration:**
```yaml
- name: "Launch Time"
  type: DATE_TIME
  visibleInStorefront: true
```

**Format:** ISO 8601 datetime (YYYY-MM-DDTHH:MM:SS)

**Use cases:**
- Launch Time: "2024-01-15T09:00:00"
- Event Start: "2024-06-20T19:30:00"
- Sale Ends: "2024-12-31T23:59:59"

---

## FILE

**Purpose:** Document or media attachment.

**Best for:** Manuals, spec sheets, certificates

**Configuration:**
```yaml
- name: "Product Manual"
  type: FILE
  visibleInStorefront: true
```

**Supported files:** PDF, images, documents (depends on Saleor configuration)

**Use cases:**
- Product Manual (PDF)
- Specification Sheet (PDF)
- Certificate of Authenticity (PDF)
- Size Chart (Image)

**Storage:** Files uploaded to Saleor media storage.

---

## REFERENCE

**Purpose:** Link to another Saleor entity.

**Best for:** Related products, brand pages, cross-sells

**Configuration:**
```yaml
- name: "Related Products"
  type: REFERENCE
  entityType: PRODUCT           # Links to products
  visibleInStorefront: true
```

**Entity types:**
- `PRODUCT` - Link to other products
- `PRODUCT_VARIANT` - Link to specific variants
- `PAGE` - Link to content pages (Models)

**Use cases:**
- Related Products: Cross-sell recommendations
- Accessories: Compatible items
- Brand Page: Link to brand content page
- Scent Profile: Link to fragrance description page

**Advanced pattern:** Create custom entities using PageTypes (Models), then reference them from products.

---

## Attribute Type Selection Summary

| Data Type | Input Type | Example |
|-----------|------------|---------|
| Single choice | DROPDOWN | Size, Material |
| Multiple choices | MULTISELECT | Features, Tags |
| Color/Pattern | SWATCH | Color with hex |
| Yes/No | BOOLEAN | Is Organic |
| Short text | PLAIN_TEXT | Model Number |
| Long text | RICH_TEXT | Description |
| Number | NUMERIC | Weight, Dimensions |
| Date only | DATE | Release Date |
| Date + Time | DATE_TIME | Launch Time |
| Document | FILE | Manual PDF |
| Entity link | REFERENCE | Related Products |

---

## Attribute Settings Reference

All attributes support these settings:

| Setting | Purpose | Default |
|---------|---------|---------|
| `visibleInStorefront` | Show on product page | true |
| `filterableInStorefront` | Enable catalog filter | false |
| `filterableInDashboard` | Enable admin filter | false |
| `storefrontSearchPosition` | Search result ranking | 0 |
| `valueRequired` | Mandatory field | false |

**Filtering best practices:**
- Enable `filterableInStorefront` for DROPDOWN, MULTISELECT, BOOLEAN, NUMERIC
- Numeric filters create range sliders
- Boolean filters create toggles
- Don't filter RICH_TEXT or FILE
