# Configuration Examples

Common configuration patterns and complete examples.

## Minimal Store

The simplest valid configuration:

```yaml
channels:
  - name: "Main Store"
    slug: "main"
    currencyCode: USD
    defaultCountry: US
    isActive: true

productTypes:
  - name: "Simple Product"
    isShippingRequired: true

products:
  - name: "My First Product"
    slug: "my-first-product"
    productType: "Simple Product"
    channelListings:
      - channel: "main"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      - sku: "PROD-001"
        channelListings:
          - channel: "main"
            price: 19.99
```

---

## Multi-Channel Store

Store with multiple sales channels:

```yaml
channels:
  - name: "US Store"
    slug: "us-store"
    currencyCode: USD
    defaultCountry: US
    isActive: true

  - name: "EU Store"
    slug: "eu-store"
    currencyCode: EUR
    defaultCountry: DE
    isActive: true

  - name: "UK Store"
    slug: "uk-store"
    currencyCode: GBP
    defaultCountry: GB
    isActive: true

products:
  - name: "International Product"
    slug: "international-product"
    productType: "Simple Product"
    channelListings:
      - channel: "us-store"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
      - channel: "eu-store"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
      - channel: "uk-store"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      - sku: "INTL-001"
        channelListings:
          - channel: "us-store"
            price: 29.99
          - channel: "eu-store"
            price: 24.99
          - channel: "uk-store"
            price: 22.99
```

---

## Product with Variants

Product with size and color variants:

```yaml
productTypes:
  - name: "T-Shirt"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        type: DROPDOWN
        values:
          - name: "House Brand"
      - name: "Material"
        type: DROPDOWN
        values:
          - name: "100% Cotton"
          - name: "Cotton Blend"
    variantAttributes:
      - name: "Size"
        type: DROPDOWN
        values:
          - name: "XS"
          - name: "S"
          - name: "M"
          - name: "L"
          - name: "XL"
      - name: "Color"
        type: SWATCH
        values:
          - name: "Black"
            value: "#000000"
          - name: "White"
            value: "#FFFFFF"
          - name: "Navy"
            value: "#000080"

products:
  - name: "Classic Crew Neck T-Shirt"
    slug: "classic-crew-neck-tshirt"
    productType: "T-Shirt"
    category: "clothing/t-shirts"
    description: |
      Our signature crew neck t-shirt. Made from premium cotton
      for all-day comfort. Pre-shrunk and machine washable.
    channelListings:
      - channel: "main"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      # Black variants
      - sku: "CREW-BLK-S"
        attributes:
          Size: "S"
          Color: "Black"
        channelListings:
          - channel: "main"
            price: 24.99
      - sku: "CREW-BLK-M"
        attributes:
          Size: "M"
          Color: "Black"
        channelListings:
          - channel: "main"
            price: 24.99
      - sku: "CREW-BLK-L"
        attributes:
          Size: "L"
          Color: "Black"
        channelListings:
          - channel: "main"
            price: 24.99
      # White variants
      - sku: "CREW-WHT-S"
        attributes:
          Size: "S"
          Color: "White"
        channelListings:
          - channel: "main"
            price: 24.99
      - sku: "CREW-WHT-M"
        attributes:
          Size: "M"
          Color: "White"
        channelListings:
          - channel: "main"
            price: 24.99
```

---

## Category Hierarchy

Nested category structure:

```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    description: "Electronic devices and accessories"
    children:
      - name: "Computers"
        slug: "computers"
        children:
          - name: "Laptops"
            slug: "laptops"
          - name: "Desktops"
            slug: "desktops"
          - name: "Accessories"
            slug: "computer-accessories"
      - name: "Phones"
        slug: "phones"
        children:
          - name: "Smartphones"
            slug: "smartphones"
          - name: "Cases & Covers"
            slug: "phone-cases"
      - name: "Audio"
        slug: "audio"
        children:
          - name: "Headphones"
            slug: "headphones"
          - name: "Speakers"
            slug: "speakers"

  - name: "Clothing"
    slug: "clothing"
    children:
      - name: "Men's"
        slug: "mens"
        children:
          - name: "Shirts"
            slug: "mens-shirts"
          - name: "Pants"
            slug: "mens-pants"
      - name: "Women's"
        slug: "womens"
        children:
          - name: "Dresses"
            slug: "womens-dresses"
          - name: "Tops"
            slug: "womens-tops"
```

---

## Shipping Configuration

Shipping zones with methods:

```yaml
warehouses:
  - name: "East Coast Warehouse"
    slug: "east-coast"
    address:
      streetAddress1: "123 Warehouse Way"
      city: "Newark"
      postalCode: "07101"
      country: US
      countryArea: "NJ"

  - name: "West Coast Warehouse"
    slug: "west-coast"
    address:
      streetAddress1: "456 Distribution Dr"
      city: "Los Angeles"
      postalCode: "90001"
      country: US
      countryArea: "CA"

shippingZones:
  - name: "US Domestic"
    countries:
      - US
    warehouses:
      - "east-coast"
      - "west-coast"
    shippingMethods:
      - name: "Standard Shipping"
        type: PRICE
        channelListings:
          - channel: "main"
            price: 5.99
            minimumOrderPrice: 0
            maximumOrderPrice: 49.99
      - name: "Free Shipping"
        type: PRICE
        channelListings:
          - channel: "main"
            price: 0
            minimumOrderPrice: 50
      - name: "Express Shipping"
        type: PRICE
        channelListings:
          - channel: "main"
            price: 14.99

  - name: "International"
    countries:
      - CA
      - GB
      - DE
      - FR
    warehouses:
      - "east-coast"
    shippingMethods:
      - name: "International Standard"
        type: WEIGHT
        minimumOrderWeight:
          value: 0
          unit: KG
        maximumOrderWeight:
          value: 30
          unit: KG
        channelListings:
          - channel: "main"
            price: 24.99
```

---

## Tax Configuration

Tax classes with country rates:

```yaml
taxClasses:
  - name: "Standard Rate"
    countries:
      - country: US
        rate: 0
      - country: GB
        rate: 20
      - country: DE
        rate: 19
      - country: FR
        rate: 20

  - name: "Reduced Rate"
    countries:
      - country: GB
        rate: 5
      - country: DE
        rate: 7
      - country: FR
        rate: 5.5

  - name: "Zero Rate"
    countries:
      - country: US
        rate: 0
      - country: GB
        rate: 0
      - country: DE
        rate: 0
```

---

## Navigation Menu

Main navigation with nested items:

```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        children:
          - name: "All Products"
            collection: "all-products"
          - name: "New Arrivals"
            collection: "new-arrivals"
          - name: "Sale"
            collection: "sale"
      - name: "Categories"
        children:
          - name: "Electronics"
            category: "electronics"
          - name: "Clothing"
            category: "clothing"
      - name: "About"
        children:
          - name: "Our Story"
            page: "about-us"
          - name: "Contact"
            page: "contact"

  - name: "Footer"
    slug: "footer"
    items:
      - name: "Customer Service"
        children:
          - name: "FAQ"
            page: "faq"
          - name: "Shipping Info"
            page: "shipping"
          - name: "Returns"
            page: "returns"
      - name: "Legal"
        children:
          - name: "Privacy Policy"
            page: "privacy"
          - name: "Terms of Service"
            page: "terms"
```

---

## Digital Product

Non-physical product configuration:

```yaml
productTypes:
  - name: "Digital Download"
    isShippingRequired: false
    isDigital: true
    productAttributes:
      - name: "File Format"
        type: DROPDOWN
        values:
          - name: "PDF"
          - name: "EPUB"
          - name: "MP3"
      - name: "File Size"
        type: PLAIN_TEXT

products:
  - name: "E-Book: Getting Started Guide"
    slug: "ebook-getting-started"
    productType: "Digital Download"
    category: "digital/ebooks"
    channelListings:
      - channel: "main"
        isPublished: true
        isAvailableForPurchase: true
        visibleInListings: true
    variants:
      - sku: "EBOOK-001-PDF"
        attributes:
          "File Format": "PDF"
          "File Size": "2.5 MB"
        channelListings:
          - channel: "main"
            price: 9.99
      - sku: "EBOOK-001-EPUB"
        attributes:
          "File Format": "EPUB"
          "File Size": "1.8 MB"
        channelListings:
          - channel: "main"
            price: 9.99
```

---

## Complete Fashion Store

See [configurator-recipes skill](../../configurator-recipes/templates/fashion-store.yml) for a complete fashion store configuration example.
