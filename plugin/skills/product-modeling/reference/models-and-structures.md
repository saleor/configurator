# Models (Pages) and Structures (Menus) Deep Dive

Complete guide to modeling custom entities and building hierarchical structures in Saleor.

## Part 1: Models (Pages)

### Understanding Models

In Saleor, **Models** (called "Pages" in the API) are flexible entities for structured data beyond products. Think of them as custom content types with typed fields.

**Terminology mapping:**
- Documentation: "Models" and "Model Types"
- API/GraphQL: `pages` and `pageTypes`
- Dashboard: Modeling → Model Types, Modeling → Models

### When to Create a Model

Create a Model when you need:

1. **Shared reference data** - Data reused across many products
2. **Structured content** - More than simple text/dropdown values
3. **Queryable entities** - Need to fetch independently via API
4. **Content management** - Rich content with publication workflow

### Model Type Configuration

A Model Type defines the schema:

```yaml
pageTypes:
  - name: "Brand"
    attributes:
      # Simple attributes
      - name: "Country of Origin"
        type: DROPDOWN
        values:
          - name: "USA"
          - name: "Germany"
          - name: "Japan"
          - name: "Italy"
          - name: "France"

      # Rich content
      - name: "Brand Story"
        type: RICH_TEXT

      # Media
      - name: "Logo"
        type: FILE

      # External link
      - name: "Official Website"
        type: PLAIN_TEXT

      # Metrics
      - name: "Founded Year"
        type: NUMERIC

      # Boolean flag
      - name: "Is Luxury"
        type: BOOLEAN
```

### Model Instance Configuration

```yaml
models:
  - title: "Nike"
    slug: "nike"
    pageType: "Brand"
    isPublished: true
    content: |
      Nike, Inc. is an American multinational corporation...
    attributes:
      Country of Origin: "USA"
      Brand Story: "<p>Founded in 1964...</p>"
      Founded Year: 1964
      Is Luxury: false
```

### Linking Models to Products

Use REFERENCE attributes to connect:

```yaml
# 1. Create attribute that references Models
productTypes:
  - name: "Sneakers"
    productAttributes:
      - name: "Brand"
        type: REFERENCE
        entityType: PAGE          # References Model (Page)
        visibleInStorefront: true

# 2. Assign Model to Product
products:
  - name: "Air Max 90"
    slug: "air-max-90"
    productType: "Sneakers"
    attributes:
      Brand: "nike"               # References Model by slug
```

### Common Model Patterns

#### Pattern 1: Brand/Manufacturer

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
        values: ["USA", "Germany", "Japan", "France", "Italy", "UK", "China", "South Korea"]
      - name: "Founded"
        type: NUMERIC
      - name: "Is Featured"
        type: BOOLEAN

models:
  - title: "Apple"
    slug: "apple"
    pageType: "Brand"
    attributes:
      Country: "USA"
      Founded: 1976
      Is Featured: true
    content: |
      Apple Inc. designs, manufactures, and markets smartphones,
      personal computers, tablets, wearables, and accessories...
```

#### Pattern 2: Scent Profile (Perfume/Candles)

```yaml
pageTypes:
  - name: "Scent Profile"
    attributes:
      - name: "Scent Family"
        type: DROPDOWN
        values:
          - name: "Citrus"
          - name: "Floral"
          - name: "Woody"
          - name: "Oriental"
          - name: "Fresh"
          - name: "Gourmand"
      - name: "Top Notes"
        type: MULTISELECT
        values:
          - name: "Bergamot"
          - name: "Lemon"
          - name: "Orange"
          - name: "Grapefruit"
      - name: "Heart Notes"
        type: MULTISELECT
        values:
          - name: "Rose"
          - name: "Jasmine"
          - name: "Lavender"
          - name: "Geranium"
      - name: "Base Notes"
        type: MULTISELECT
        values:
          - name: "Sandalwood"
          - name: "Vanilla"
          - name: "Musk"
          - name: "Amber"
      - name: "Intensity"
        type: DROPDOWN
        values: ["Light", "Medium", "Strong", "Intense"]
      - name: "Best Season"
        type: MULTISELECT
        values: ["Spring", "Summer", "Fall", "Winter"]
      - name: "Description"
        type: RICH_TEXT

models:
  - title: "Citrus Zest"
    slug: "citrus-zest"
    pageType: "Scent Profile"
    attributes:
      Scent Family: "Citrus"
      Top Notes: ["Bergamot", "Lemon"]
      Heart Notes: ["Jasmine"]
      Base Notes: ["Sandalwood"]
      Intensity: "Light"
      Best Season: ["Spring", "Summer"]
```

#### Pattern 3: Ingredient (Food/Cosmetics)

```yaml
pageTypes:
  - name: "Ingredient"
    attributes:
      - name: "Scientific Name"
        type: PLAIN_TEXT
      - name: "Category"
        type: DROPDOWN
        values:
          - name: "Active"
          - name: "Emollient"
          - name: "Preservative"
          - name: "Fragrance"
          - name: "Colorant"
      - name: "Benefits"
        type: MULTISELECT
        values:
          - name: "Moisturizing"
          - name: "Anti-Aging"
          - name: "Brightening"
          - name: "Soothing"
          - name: "Exfoliating"
      - name: "Common Allergen"
        type: BOOLEAN
      - name: "Vegan"
        type: BOOLEAN
      - name: "EWG Rating"
        type: NUMERIC    # 1-10 safety rating
      - name: "Description"
        type: RICH_TEXT
      - name: "Related Research"
        type: FILE       # PDF studies

models:
  - title: "Hyaluronic Acid"
    slug: "hyaluronic-acid"
    pageType: "Ingredient"
    attributes:
      Scientific Name: "Sodium Hyaluronate"
      Category: "Active"
      Benefits: ["Moisturizing", "Anti-Aging"]
      Common Allergen: false
      Vegan: true
      EWG Rating: 1
```

#### Pattern 4: Artist/Designer

```yaml
pageTypes:
  - name: "Designer"
    attributes:
      - name: "Nationality"
        type: DROPDOWN
      - name: "Specialization"
        type: MULTISELECT
        values: ["Furniture", "Lighting", "Textiles", "Ceramics", "Jewelry"]
      - name: "Active Since"
        type: NUMERIC
      - name: "Biography"
        type: RICH_TEXT
      - name: "Portrait"
        type: FILE
      - name: "Website"
        type: PLAIN_TEXT
      - name: "Awards"
        type: RICH_TEXT

models:
  - title: "Dieter Rams"
    slug: "dieter-rams"
    pageType: "Designer"
    attributes:
      Nationality: "Germany"
      Specialization: ["Furniture", "Consumer Electronics"]
      Active Since: 1955
```

#### Pattern 5: Recipe/Usage Guide

```yaml
pageTypes:
  - name: "Recipe"
    attributes:
      - name: "Difficulty"
        type: DROPDOWN
        values: ["Easy", "Medium", "Hard", "Expert"]
      - name: "Prep Time"
        type: NUMERIC        # minutes
      - name: "Cook Time"
        type: NUMERIC        # minutes
      - name: "Servings"
        type: NUMERIC
      - name: "Cuisine"
        type: DROPDOWN
        values: ["Italian", "Asian", "Mexican", "American", "French"]
      - name: "Diet Tags"
        type: MULTISELECT
        values: ["Vegetarian", "Vegan", "Gluten-Free", "Keto", "Low-Carb"]
      - name: "Instructions"
        type: RICH_TEXT
      - name: "Video"
        type: PLAIN_TEXT     # YouTube URL
      - name: "Featured Image"
        type: FILE

# Link products to recipes
productTypes:
  - name: "Food Product"
    productAttributes:
      - name: "Featured In Recipes"
        type: REFERENCE
        entityType: PAGE
```

---

## Part 2: Structures (Menus)

### Understanding Structures

**Structures** (called "Menus" in the API) are hierarchical assembly mechanisms that link various entities together. They're not just for navigation—they can model any curated hierarchy.

**Structure Item can link to:**
- Category
- Collection
- Model (Page)
- External URL

### Structure Configuration

```yaml
menus:
  - name: "Structure Name"
    slug: "structure-slug"
    items:
      - name: "Item Name"
        category: "category-slug"     # OR
        collection: "collection-slug" # OR
        page: "model-slug"            # OR
        url: "https://..."            # External URL
        children:                     # Nested items
          - name: "Child Item"
            category: "child-category"
```

### Common Structure Patterns

#### Pattern 1: Main Navigation

```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        category: "shop"
        children:
          - name: "New Arrivals"
            collection: "new-arrivals"
          - name: "Best Sellers"
            collection: "best-sellers"
          - name: "Sale"
            collection: "sale"
      - name: "Categories"
        children:
          - name: "Electronics"
            category: "electronics"
            children:
              - name: "Phones"
                category: "phones"
              - name: "Laptops"
                category: "laptops"
          - name: "Clothing"
            category: "clothing"
            children:
              - name: "Men"
                category: "mens"
              - name: "Women"
                category: "womens"
      - name: "Brands"
        url: "/brands"
        children:
          - name: "Nike"
            page: "nike"
          - name: "Apple"
            page: "apple"
          - name: "Samsung"
            page: "samsung"
      - name: "About"
        page: "about-us"
```

#### Pattern 2: Footer Links

```yaml
menus:
  - name: "Footer"
    slug: "footer"
    items:
      - name: "Customer Service"
        children:
          - name: "Contact Us"
            page: "contact"
          - name: "Shipping Info"
            page: "shipping"
          - name: "Returns"
            page: "returns"
          - name: "FAQ"
            page: "faq"
      - name: "Company"
        children:
          - name: "About Us"
            page: "about"
          - name: "Careers"
            page: "careers"
          - name: "Press"
            page: "press"
      - name: "Legal"
        children:
          - name: "Privacy Policy"
            page: "privacy"
          - name: "Terms of Service"
            page: "terms"
          - name: "Cookie Policy"
            page: "cookies"
      - name: "Follow Us"
        children:
          - name: "Instagram"
            url: "https://instagram.com/brand"
          - name: "Twitter"
            url: "https://twitter.com/brand"
          - name: "Facebook"
            url: "https://facebook.com/brand"
```

#### Pattern 3: Mega Menu

```yaml
menus:
  - name: "Mega Menu - Electronics"
    slug: "mega-electronics"
    items:
      - name: "Phones & Tablets"
        category: "phones-tablets"
        children:
          - name: "Smartphones"
            category: "smartphones"
          - name: "Tablets"
            category: "tablets"
          - name: "Accessories"
            category: "phone-accessories"
          - name: "New iPhone"
            collection: "new-iphone"        # Promotional
      - name: "Computers"
        category: "computers"
        children:
          - name: "Laptops"
            category: "laptops"
          - name: "Desktops"
            category: "desktops"
          - name: "Monitors"
            category: "monitors"
          - name: "Back to School"
            collection: "back-to-school"    # Promotional
      - name: "Featured Brands"
        children:
          - name: "Apple"
            page: "apple"
          - name: "Samsung"
            page: "samsung"
          - name: "Sony"
            page: "sony"
      - name: "Deals"
        collection: "electronics-deals"
```

#### Pattern 4: Curated Guide

```yaml
# Home Office Setup Guide - mixes content, products, and promotions
menus:
  - name: "Home Office Setup Guide"
    slug: "home-office-guide"
    items:
      - name: "Getting Started"
        page: "home-office-intro"           # Content Model
      - name: "Ergonomics"
        children:
          - name: "Ergonomics 101"
            page: "ergonomics-tips"         # Content Model
          - name: "Recommended Chairs"
            category: "office-chairs"       # Products
          - name: "Standing Desks"
            category: "standing-desks"      # Products
      - name: "Technology"
        children:
          - name: "Monitor Setup Guide"
            page: "monitor-setup"           # Content Model
          - name: "Monitors"
            category: "monitors"            # Products
          - name: "Webcams"
            category: "webcams"             # Products
          - name: "Headsets"
            category: "headsets"            # Products
      - name: "Connectivity"
        children:
          - name: "WiFi Optimization"
            page: "wifi-guide"              # Content Model
          - name: "Routers"
            category: "routers"             # Products
          - name: "Network Accessories"
            category: "network-accessories" # Products
      - name: "Bundle Deals"
        collection: "home-office-bundles"   # Promotional collection
```

#### Pattern 5: Seasonal/Campaign Structure

```yaml
menus:
  - name: "Holiday Gift Guide 2024"
    slug: "holiday-2024"
    items:
      - name: "Gifts Under $25"
        collection: "gifts-under-25"
      - name: "Gifts Under $50"
        collection: "gifts-under-50"
      - name: "Gifts Under $100"
        collection: "gifts-under-100"
      - name: "Luxury Gifts"
        collection: "luxury-gifts"
      - name: "By Recipient"
        children:
          - name: "For Him"
            collection: "gifts-for-him"
          - name: "For Her"
            collection: "gifts-for-her"
          - name: "For Kids"
            collection: "gifts-for-kids"
          - name: "For Home"
            collection: "gifts-for-home"
      - name: "Gift Cards"
        category: "gift-cards"
      - name: "Wrapping Services"
        page: "gift-wrapping"
```

---

## Part 3: Combining Models and Structures

### Example: Wine Store with Regions & Grape Varieties

```yaml
# 1. Model Types for wine-specific concepts
pageTypes:
  - name: "Wine Region"
    attributes:
      - name: "Country"
        type: DROPDOWN
        values: ["France", "Italy", "Spain", "USA", "Argentina", "Australia"]
      - name: "Climate"
        type: DROPDOWN
        values: ["Mediterranean", "Continental", "Oceanic", "Desert"]
      - name: "Notable Wines"
        type: MULTISELECT
        values: ["Red", "White", "Rosé", "Sparkling", "Dessert"]
      - name: "Description"
        type: RICH_TEXT
      - name: "Map Image"
        type: FILE

  - name: "Grape Variety"
    attributes:
      - name: "Color"
        type: DROPDOWN
        values: ["Red", "White"]
      - name: "Tasting Notes"
        type: RICH_TEXT
      - name: "Food Pairings"
        type: MULTISELECT
        values: ["Red Meat", "Poultry", "Seafood", "Cheese", "Desserts"]
      - name: "Serving Temperature"
        type: PLAIN_TEXT

# 2. Model instances
models:
  - title: "Bordeaux"
    slug: "bordeaux"
    pageType: "Wine Region"
    attributes:
      Country: "France"
      Climate: "Oceanic"
      Notable Wines: ["Red", "White", "Dessert"]

  - title: "Cabernet Sauvignon"
    slug: "cabernet-sauvignon"
    pageType: "Grape Variety"
    attributes:
      Color: "Red"
      Food Pairings: ["Red Meat", "Cheese"]
      Serving Temperature: "16-18°C"

# 3. Product Type linking to Models
productTypes:
  - name: "Wine"
    productAttributes:
      - name: "Region"
        type: REFERENCE
        entityType: PAGE
      - name: "Grape Varieties"
        type: REFERENCE
        entityType: PAGE
      - name: "Vintage"
        type: NUMERIC
      - name: "Alcohol"
        type: NUMERIC
      - name: "Tasting Notes"
        type: RICH_TEXT
    variantAttributes:
      - name: "Bottle Size"
        type: DROPDOWN
        values: ["375ml", "750ml", "1.5L", "3L"]

# 4. Structure for navigation
menus:
  - name: "Wine Navigation"
    slug: "wine-nav"
    items:
      - name: "Shop by Region"
        children:
          - name: "France"
            children:
              - name: "Bordeaux"
                page: "bordeaux"
              - name: "Burgundy"
                page: "burgundy"
              - name: "Champagne"
                page: "champagne"
          - name: "Italy"
            children:
              - name: "Tuscany"
                page: "tuscany"
              - name: "Piedmont"
                page: "piedmont"
      - name: "Shop by Grape"
        children:
          - name: "Red Grapes"
            children:
              - name: "Cabernet Sauvignon"
                page: "cabernet-sauvignon"
              - name: "Merlot"
                page: "merlot"
          - name: "White Grapes"
            children:
              - name: "Chardonnay"
                page: "chardonnay"
              - name: "Sauvignon Blanc"
                page: "sauvignon-blanc"
      - name: "Collections"
        children:
          - name: "Award Winners"
            collection: "award-winners"
          - name: "Under $20"
            collection: "under-20"
          - name: "Organic & Biodynamic"
            collection: "organic"
```

---

## Summary: When to Use What

| Need | Solution |
|------|----------|
| Purchasable item | Product + Variants |
| Product characteristic | Attribute (Product or Variant level) |
| Reusable entity with rich data | Model (PageType + Page) |
| Primary product taxonomy | Category (hierarchical) |
| Marketing grouping | Collection (flat) |
| Link entities into hierarchy | Structure (Menu) |
| Navigation | Structure with Categories/Collections |
| Curated guide | Structure with Models + Categories + Collections |
| Brand pages | Model linked via REFERENCE attribute |
