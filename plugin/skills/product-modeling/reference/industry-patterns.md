# Industry-Specific Product Modeling Patterns

Detailed patterns for modeling products across different industries.

## 1. Jewelry & Accessories

### Product Type: Ring

```yaml
productTypes:
  - name: "Ring"
    isShippingRequired: true
    weight:
      value: 5
      unit: G
    productAttributes:
      - name: "Metal Type"
        type: DROPDOWN
        values:
          - name: "14K Gold"
          - name: "18K Gold"
          - name: "Sterling Silver"
          - name: "Platinum"
          - name: "Rose Gold"
      - name: "Stone Type"
        type: DROPDOWN
        values:
          - name: "Diamond"
          - name: "Sapphire"
          - name: "Ruby"
          - name: "Emerald"
          - name: "None"
      - name: "Stone Carat"
        type: NUMERIC
        unit: CARAT
      - name: "Certificate"
        type: FILE
    variantAttributes:
      - name: "Ring Size"
        type: DROPDOWN
        values:
          - name: "5"
          - name: "6"
          - name: "7"
          - name: "8"
          - name: "9"
          - name: "10"
```

**Key decisions:**
- Metal and stone are product-level (define the piece)
- Ring size is variant-level (purchasable option)
- Certificate as FILE for authenticity docs

---

## 2. Automotive Parts

### Product Type: Car Part

```yaml
productTypes:
  - name: "Brake Pad Set"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Part Number"
        type: PLAIN_TEXT
      - name: "OEM Number"
        type: PLAIN_TEXT
      - name: "Compatible Makes"
        type: MULTISELECT
        values:
          - name: "Toyota"
          - name: "Honda"
          - name: "Ford"
          - name: "BMW"
          - name: "Mercedes"
      - name: "Position"
        type: DROPDOWN
        values:
          - name: "Front"
          - name: "Rear"
      - name: "Material"
        type: DROPDOWN
        values:
          - name: "Ceramic"
          - name: "Semi-Metallic"
          - name: "Organic"
      - name: "Specifications"
        type: RICH_TEXT
    variantAttributes:
      - name: "Vehicle Model"
        type: DROPDOWN
```

**Key decisions:**
- Part numbers and compatibility at product level
- Vehicle-specific variants for different fitments
- MULTISELECT for compatible makes (multiple can apply)

---

## 3. Cosmetics & Beauty

### Product Type: Lipstick

```yaml
productTypes:
  - name: "Lipstick"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Product Line"
        type: DROPDOWN
        values:
          - name: "Classic Collection"
          - name: "Matte Range"
          - name: "Hydrating Line"
      - name: "Finish"
        type: DROPDOWN
        values:
          - name: "Matte"
          - name: "Satin"
          - name: "Gloss"
          - name: "Metallic"
      - name: "Benefits"
        type: MULTISELECT
        values:
          - name: "Long-Lasting"
          - name: "Moisturizing"
          - name: "Vitamin E"
          - name: "SPF Protection"
      - name: "Ingredients"
        type: RICH_TEXT
      - name: "Is Vegan"
        type: BOOLEAN
      - name: "Is Cruelty-Free"
        type: BOOLEAN
    variantAttributes:
      - name: "Shade"
        type: SWATCH
```

**Key decisions:**
- Benefits as MULTISELECT (multiple apply)
- Vegan/Cruelty-Free as BOOLEAN for filtering
- Shade as SWATCH with color codes

---

## 4. Books & Media

### Product Type: Book

```yaml
productTypes:
  - name: "Book"
    isShippingRequired: true
    productAttributes:
      - name: "Author"
        type: PLAIN_TEXT
      - name: "Publisher"
        type: DROPDOWN
      - name: "ISBN"
        type: PLAIN_TEXT
      - name: "Genre"
        type: MULTISELECT
        values:
          - name: "Fiction"
          - name: "Non-Fiction"
          - name: "Mystery"
          - name: "Romance"
          - name: "Science Fiction"
          - name: "Biography"
      - name: "Publication Date"
        type: DATE
      - name: "Page Count"
        type: NUMERIC
      - name: "Language"
        type: DROPDOWN
        values:
          - name: "English"
          - name: "Spanish"
          - name: "French"
          - name: "German"
      - name: "Synopsis"
        type: RICH_TEXT
    variantAttributes:
      - name: "Format"
        type: DROPDOWN
        values:
          - name: "Hardcover"
          - name: "Paperback"
          - name: "E-Book"
          - name: "Audiobook"
```

**Key decisions:**
- Genre as MULTISELECT (books can span genres)
- Format as variant (different prices, different fulfillment)
- ISBN at product level (same book regardless of format)

---

## 5. Wine & Spirits

### Product Type: Wine

```yaml
productTypes:
  - name: "Wine"
    isShippingRequired: true
    productAttributes:
      - name: "Winery"
        type: DROPDOWN
      - name: "Region"
        type: DROPDOWN
        values:
          - name: "Napa Valley"
          - name: "Bordeaux"
          - name: "Tuscany"
          - name: "Rioja"
          - name: "Marlborough"
      - name: "Grape Variety"
        type: MULTISELECT
        values:
          - name: "Cabernet Sauvignon"
          - name: "Merlot"
          - name: "Pinot Noir"
          - name: "Chardonnay"
          - name: "Sauvignon Blanc"
      - name: "Vintage"
        type: DROPDOWN
      - name: "Alcohol Content"
        type: NUMERIC
        unit: PERCENT
      - name: "Tasting Notes"
        type: RICH_TEXT
      - name: "Food Pairing"
        type: MULTISELECT
        values:
          - name: "Red Meat"
          - name: "Poultry"
          - name: "Seafood"
          - name: "Cheese"
          - name: "Dessert"
      - name: "Awards"
        type: RICH_TEXT
    variantAttributes:
      - name: "Bottle Size"
        type: DROPDOWN
        values:
          - name: "375ml (Half)"
          - name: "750ml (Standard)"
          - name: "1.5L (Magnum)"
```

**Key decisions:**
- Grape variety as MULTISELECT (blends exist)
- Food pairing as MULTISELECT
- Bottle size as variant (affects price)
- Vintage could be product or variant depending on inventory

---

## 6. Pet Products

### Product Type: Dog Food

```yaml
productTypes:
  - name: "Dog Food"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Life Stage"
        type: DROPDOWN
        values:
          - name: "Puppy"
          - name: "Adult"
          - name: "Senior"
          - name: "All Life Stages"
      - name: "Dog Size"
        type: DROPDOWN
        values:
          - name: "Small Breed"
          - name: "Medium Breed"
          - name: "Large Breed"
          - name: "All Sizes"
      - name: "Primary Protein"
        type: DROPDOWN
        values:
          - name: "Chicken"
          - name: "Beef"
          - name: "Salmon"
          - name: "Lamb"
          - name: "Turkey"
      - name: "Special Diet"
        type: MULTISELECT
        values:
          - name: "Grain-Free"
          - name: "Limited Ingredient"
          - name: "Weight Management"
          - name: "Sensitive Stomach"
          - name: "High Protein"
      - name: "Ingredients"
        type: RICH_TEXT
      - name: "Guaranteed Analysis"
        type: RICH_TEXT
    variantAttributes:
      - name: "Bag Size"
        type: DROPDOWN
        values:
          - name: "4 lb"
          - name: "15 lb"
          - name: "30 lb"
```

**Key decisions:**
- Life stage and size define the product
- Special diet as MULTISELECT (multiple can apply)
- Bag size as variant (price varies by size)

---

## 7. Sports Equipment

### Product Type: Running Shoe

```yaml
productTypes:
  - name: "Running Shoe"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Model Name"
        type: PLAIN_TEXT
      - name: "Running Style"
        type: DROPDOWN
        values:
          - name: "Road Running"
          - name: "Trail Running"
          - name: "Track & Field"
          - name: "Cross Training"
      - name: "Support Type"
        type: DROPDOWN
        values:
          - name: "Neutral"
          - name: "Stability"
          - name: "Motion Control"
      - name: "Drop"
        type: NUMERIC
        unit: MM
      - name: "Technologies"
        type: MULTISELECT
        values:
          - name: "Carbon Plate"
          - name: "Foam Cushioning"
          - name: "Gore-Tex"
          - name: "Reflective"
    variantAttributes:
      - name: "Size"
        type: DROPDOWN
      - name: "Width"
        type: DROPDOWN
        values:
          - name: "Narrow (B)"
          - name: "Standard (D)"
          - name: "Wide (2E)"
          - name: "Extra Wide (4E)"
      - name: "Color"
        type: SWATCH
```

**Key decisions:**
- Running style and support define the shoe
- Size AND width as variant attributes (both affect fit)
- Drop as NUMERIC for filtering runners' preferences

---

## 8. Home & Garden

### Product Type: Indoor Plant

```yaml
productTypes:
  - name: "Indoor Plant"
    isShippingRequired: true
    productAttributes:
      - name: "Botanical Name"
        type: PLAIN_TEXT
      - name: "Common Name"
        type: PLAIN_TEXT
      - name: "Light Requirements"
        type: DROPDOWN
        values:
          - name: "Low Light"
          - name: "Medium Light"
          - name: "Bright Indirect"
          - name: "Direct Sunlight"
      - name: "Watering Frequency"
        type: DROPDOWN
        values:
          - name: "Weekly"
          - name: "Bi-Weekly"
          - name: "Monthly"
          - name: "When Soil Dry"
      - name: "Pet Safe"
        type: BOOLEAN
      - name: "Air Purifying"
        type: BOOLEAN
      - name: "Care Instructions"
        type: RICH_TEXT
    variantAttributes:
      - name: "Pot Size"
        type: DROPDOWN
        values:
          - name: "4 inch"
          - name: "6 inch"
          - name: "8 inch"
          - name: "10 inch"
```

**Key decisions:**
- Pet Safe as BOOLEAN (important filter for pet owners)
- Air Purifying as BOOLEAN (marketing highlight)
- Pot size as variant (affects price and shipping)

---

## 9. Subscription Products

### Product Type: Subscription Box

```yaml
productTypes:
  - name: "Subscription Box"
    isShippingRequired: true
    productAttributes:
      - name: "Box Theme"
        type: DROPDOWN
        values:
          - name: "Snacks"
          - name: "Beauty"
          - name: "Books"
          - name: "Fitness"
      - name: "Included Items"
        type: NUMERIC  # Number of items per box
      - name: "Retail Value"
        type: PLAIN_TEXT
      - name: "Customizable"
        type: BOOLEAN
      - name: "Box Contents"
        type: RICH_TEXT
    variantAttributes:
      - name: "Frequency"
        type: DROPDOWN
        values:
          - name: "Monthly"
          - name: "Bi-Monthly"
          - name: "Quarterly"
      - name: "Duration"
        type: DROPDOWN
        values:
          - name: "1 Month"
          - name: "3 Months"
          - name: "6 Months"
          - name: "12 Months"
```

**Key decisions:**
- Frequency and duration as variants (different pricing)
- Box theme at product level (different products)
- Customizable as BOOLEAN

---

## 10. Musical Instruments

### Product Type: Electric Guitar

```yaml
productTypes:
  - name: "Electric Guitar"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
      - name: "Model"
        type: PLAIN_TEXT
      - name: "Body Style"
        type: DROPDOWN
        values:
          - name: "Stratocaster"
          - name: "Les Paul"
          - name: "Telecaster"
          - name: "SG"
          - name: "Flying V"
      - name: "Body Wood"
        type: DROPDOWN
        values:
          - name: "Alder"
          - name: "Mahogany"
          - name: "Ash"
          - name: "Basswood"
      - name: "Neck Wood"
        type: DROPDOWN
        values:
          - name: "Maple"
          - name: "Mahogany"
          - name: "Roasted Maple"
      - name: "Pickup Configuration"
        type: DROPDOWN
        values:
          - name: "SSS"
          - name: "HSS"
          - name: "HH"
          - name: "HSH"
      - name: "Scale Length"
        type: NUMERIC
        unit: INCH
      - name: "Frets"
        type: NUMERIC
      - name: "Specifications"
        type: RICH_TEXT
    variantAttributes:
      - name: "Finish"
        type: SWATCH
      - name: "Handedness"
        type: DROPDOWN
        values:
          - name: "Right-Handed"
          - name: "Left-Handed"
```

**Key decisions:**
- Wood types and pickup config define the instrument
- Finish as SWATCH (visual selection)
- Left/Right handed as variant (different SKUs)

---

## Pattern Summary by Industry

| Industry | Key Product-Level | Key Variant-Level | SKU Strategy |
|----------|-------------------|-------------------|--------------|
| Jewelry | Metal, Stone | Ring Size | Low (5-10 sizes) |
| Automotive | Part Number, Compatibility | Vehicle Model | Medium (by fitment) |
| Cosmetics | Formula, Benefits | Shade | Medium (10-30 shades) |
| Books | Author, Genre, ISBN | Format | Low (3-4 formats) |
| Wine | Region, Grape, Vintage | Bottle Size | Low (2-3 sizes) |
| Pet Products | Life Stage, Protein | Bag Size | Low (3-4 sizes) |
| Sports | Style, Support | Size, Width, Color | High (careful!) |
| Plants | Care Needs, Safety | Pot Size | Low (3-5 sizes) |
| Subscriptions | Theme, Contents | Frequency, Duration | Medium |
| Instruments | Woods, Electronics | Finish, Handedness | Low (color + handed) |
