# 🎯 Saleor Configurator - Error Recovery Examples

## Complete Error Scenarios with Recovery Steps

### 1. 🔐 **Authentication & Permission Errors**

#### Invalid Token
**Scenario:** Using an expired or incorrect API token
```bash
pnpm dlx @saleor/configurator deploy --token WRONG_TOKEN
```

**Error Message:**
```
❌ Deployment failed: Authentication Error

Authentication failed

Details:
  • operation: deployment

Suggested actions:
  1. Verify your API token is correct: --token YOUR_TOKEN
  2. Check token permissions in Saleor dashboard
  3. Generate a new token if the current one is expired
  4. Ensure the token has the required permissions for this operation

For more details, run with --verbose flag.
```

#### Insufficient Permissions
**Scenario:** Token lacks required permissions
```
❌ Deployment failed: Authentication Error

Permission denied for operation

Details:
  • operation: createProduct
  • required: MANAGE_PRODUCTS

Suggested actions:
  1. Check token permissions in Saleor dashboard
  2. Ensure token has MANAGE_PRODUCTS permission
  3. Generate a new token with proper permissions
  4. Contact your Saleor admin if you need access
```

### 2. 🌐 **Network & URL Errors**

#### Invalid URL Format
**Scenario:** Missing /graphql/ endpoint
```bash
pnpm dlx @saleor/configurator deploy --url https://store.saleor.cloud
```

**Error Message:**
```
❌ Deployment failed: Network Error

Unable to connect to Saleor instance

Details:
  • url: https://store.saleor.cloud
  • error: Not Found (404)

This usually means:
  • Your URL is missing the /graphql/ endpoint
    Expected format: https://your-store.saleor.cloud/graphql/
  • The Saleor instance doesn't exist at this URL

💡 Check your URL and ensure it ends with /graphql/

Suggested actions:
  1. Check your internet connection
  2. Verify the Saleor instance URL is correct
  3. Ensure the Saleor instance is running and accessible
  4. Check if you're behind a proxy or firewall

Run: curl -I https://store.saleor.cloud/graphql/
```

#### Connection Timeout
**Scenario:** Saleor instance is down or unreachable
```
❌ Deployment failed: Network Error

Connection timeout

Details:
  • operation: deployment
  • url: https://store.saleor.cloud/graphql/
  • timeout: 30000ms

Suggested actions:
  1. Check your internet connection
  2. Verify the instance is running: ping store.saleor.cloud
  3. Check Saleor status page for outages
  4. Try again in a few minutes
```

### 3. 💱 **Currency & Country Code Errors**

#### Invalid Currency Code
**Config:**
```yaml
channels:
  - name: "European Store"
    slug: "eu-store"
    currencyCode: "EURO"  # Should be EUR
```

**Error Message:**
```
❌ Validation Error: Invalid currency code 'EURO'

→ Fix: Use a valid ISO 4217 currency code instead of 'EURO'
→ Check: Common codes: USD, EUR, GBP, CAD, AUD, JPY
→ Run: See https://en.wikipedia.org/wiki/ISO_4217 for full list

Valid currency codes for your region:
  • EUR - Euro
  • GBP - British Pound
  • CHF - Swiss Franc
  • SEK - Swedish Krona
  • NOK - Norwegian Krone
```

#### Invalid Country Code
**Config:**
```yaml
channels:
  - name: "UK Store"
    slug: "uk-store"
    defaultCountry: "UK"  # Should be GB
```

**Error Message:**
```
❌ Validation Error: Invalid country code 'UK'

→ Fix: Use a valid ISO 3166-1 alpha-2 country code instead of 'UK'
→ Check: Common codes: US, GB, DE, FR, CA, AU, JP
→ Run: See https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2 for full list

Did you mean?
  • GB - United Kingdom
  • UA - Ukraine
```

### 4. 📦 **Warehouse Errors**

#### Missing Required Fields
**Config:**
```yaml
warehouses:
  - name: "Main Warehouse"
    # Missing slug and address
```

**Error Message:**
```
❌ Warehouse validation failed

Warehouse slug is required

→ Fix: Add required field 'slug' to warehouse configuration
→ Check: Required fields: name, slug, address (streetAddress1, city, country)
→ Run: See example.yml for warehouse configuration template

Example:
warehouses:
  - name: "Main Warehouse"
    slug: "main-warehouse"
    address:
      streetAddress1: "123 Main St"
      city: "New York"
      country: "US"
```

#### Warehouse Not Found
**Config:**
```yaml
shippingZones:
  - name: "US Zone"
    warehouses: ["old-warehouse"]  # Doesn't exist
```

**Error Message:**
```
❌ Warehouse 'old-warehouse' not found

→ Fix: Ensure warehouse 'old-warehouse' exists in your warehouses configuration
→ Check: Warehouse slugs must match exactly (case-sensitive)
→ Run: saleor-configurator diff --include=warehouses

Available warehouses:
  • main-warehouse
  • backup-warehouse
  • dropship-warehouse
```

### 5. 🚢 **Shipping Zone Errors**

#### No Countries Specified
**Config:**
```yaml
shippingZones:
  - name: "International"
    countries: []  # Empty
```

**Error Message:**
```
❌ Shipping zone validation failed

At least one country is required

→ Fix: Add at least one country code to the shipping zone
→ Check: Use ISO 3166-1 alpha-2 codes (e.g., US, GB, DE)
→ Run: countries: [US, CA, MX]

Example configurations:
  • North America: [US, CA, MX]
  • Europe: [DE, FR, IT, ES, GB]
  • Asia Pacific: [JP, CN, AU, NZ]
```

#### Invalid Shipping Method
**Config:**
```yaml
shippingZones:
  - name: "US Zone"
    shippingMethods:
      - name: "Express"
        # Missing type and price
```

**Error Message:**
```
❌ Shipping method validation failed

Shipping method type is required

→ Fix: Add required field 'type' to shipping method
→ Check: Required fields: name, type, channelListings (with channel and price)
→ Run: See example.yml for shipping method template

Valid types:
  • PRICE - Fixed price shipping
  • WEIGHT - Weight-based pricing
  • FREE - Free shipping

Example:
shippingMethods:
  - name: "Express"
    type: "PRICE"
    channelListings:
      - channel: "default-channel"
        price: 9.99
```

### 6. 💰 **Tax Configuration Errors**

#### Invalid Tax Rate
**Config:**
```yaml
taxes:
  taxClasses:
    - name: "High Tax"
      countryRates:
        - countryCode: "US"
          rate: 150  # Over 100%
```

**Error Message:**
```
❌ Invalid country rate for 'US': 150

→ Fix: Fix tax rate for country 'US' (currently 150)
→ Check: Tax rates must be between 0 and 100
→ Run: Update countryRates in your tax configuration

Valid examples:
  • US Sales Tax: 8.5
  • EU VAT: 21.0
  • Japan Consumption Tax: 10.0
  • No Tax: 0
```

#### Duplicate Tax Class
**Config:**
```yaml
taxes:
  taxClasses:
    - name: "Standard Tax"
    - name: "Standard Tax"  # Duplicate
```

**Error Message:**
```
❌ Duplicate tax class names found: Standard Tax

→ Fix: Remove duplicate tax class entries from your config
→ Check: Each tax class must have a unique identifier
→ Run: saleor-configurator diff --include=taxes

Existing tax classes:
  • Standard Tax
  • Reduced Tax
  • Zero Tax
```

### 7. 📁 **Category Errors**

#### Duplicate Category Slugs
**Config:**
```yaml
categories:
  - name: "Electronics"
    slug: "products"
  - name: "Clothing"
    slug: "products"  # Duplicate slug
```

**Error Message:**
```
❌ Duplicate category slugs found: products

→ Fix: Use unique slugs - 'products' already exists
→ Check: View existing entities to find available slugs
→ Run: saleor-configurator introspect --include=categories

Suggestion: Use descriptive slugs like:
  • electronics
  • clothing
  • electronics-products
  • clothing-products
```

#### Failed Subcategory Creation
**Config:**
```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    subcategories:
      - name: "Phones"
        slug: "electronics"  # Same as parent
```

**Error Message:**
```
❌ Failed to create subcategories for 'Electronics'

→ Fix: Check subcategory configuration for parent category 'Electronics'
→ Check: Ensure subcategory names and slugs are unique
→ Run: Review category hierarchy in your configuration

Issue: Subcategory slug 'electronics' conflicts with parent category
Suggestion: Use 'electronics-phones' or 'phones'
```

### 8. 🏷️ **Product & SKU Errors**

#### Duplicate SKU
**Config:**
```yaml
products:
  - name: "Blue T-Shirt"
    variants:
      - sku: "TSHIRT-001"
  - name: "Red T-Shirt"
    variants:
      - sku: "TSHIRT-001"  # Duplicate
```

**Error Message:**
```
❌ SKU 'TSHIRT-001' already exists

→ Fix: Change SKU 'TSHIRT-001' to a unique value
→ Check: Each product variant must have a unique SKU
→ Run: saleor-configurator introspect --include=products

Existing SKUs starting with 'TSHIRT':
  • TSHIRT-001 (Blue T-Shirt - Size M)
  • TSHIRT-002 (Green T-Shirt - Size L)

Suggestion: Use TSHIRT-003 or RED-TSHIRT-001
```

#### Product Type Not Found
**Config:**
```yaml
products:
  - name: "New Book"
    productType: "Digital Book"  # Doesn't exist
```

**Error Message:**
```
❌ Product type 'Digital Book' not found

→ Fix: Ensure product type 'Digital Book' exists or is defined before products that use it
→ Check: View existing product types
→ Run: saleor-configurator introspect --include=productTypes

Available product types:
  • Book
  • E-book
  • Audiobook
  • Physical Product

Did you mean 'E-book'?
```

### 9. 📄 **Page Type & Attribute Errors**

#### Missing EntityType for Reference
**Config:**
```yaml
pageTypes:
  - name: "Landing Page"
    attributes:
      - name: "Featured Product"
        inputType: "REFERENCE"
        # Missing entityType
```

**Error Message:**
```
❌ Entity type is required for reference attribute 'Featured Product'

→ Fix: Add entityType field to the 'Featured Product' reference attribute in your config
→ Check: Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT
→ Run: saleor-configurator diff --include=attributes

Example:
attributes:
  - name: "Featured Product"
    inputType: "REFERENCE"
    entityType: "PRODUCT"
```

#### Attribute Not Found
**Config:**
```yaml
productTypes:
  - name: "Clothing"
    productAttributes:
      - attribute: "fabric-type"  # Doesn't exist
```

**Error Message:**
```
❌ Attribute 'fabric-type' not found

→ Fix: Create the attribute 'fabric-type' first or reference an existing one
→ Check: View available attributes
→ Run: saleor-configurator introspect --include=attributes

Available attributes similar to 'fabric-type':
  • fabric
  • material
  • clothing-material

To create the attribute, add:
attributes:
  - name: "Fabric Type"
    slug: "fabric-type"
    inputType: "DROPDOWN"
    values:
      - name: "Cotton"
      - name: "Polyester"
      - name: "Wool"
```

### 10. 🔄 **Batch Operation Errors**

#### Partial Deployment Failure
**Scenario:** Multiple entities fail during deployment

**Error Message:**
```
❌ Product Types - 3 of 10 failed

✅ Successful:
  • Book
  • Clothing
  • Electronics
  • Furniture
  • Food
  • Toys
  • Sports

❌ Failed:
  • Digital Product
    Error: Attribute 'download-link' not found
    → Fix: Create the attribute 'download-link' first
    → Check: View available attributes
    → Run: saleor-configurator introspect --include=attributes

  • Subscription Box
    Error: Invalid attribute type for 'renewal-period'
    → Fix: Change attribute type to DROPDOWN or MULTISELECT
    → Check: REFERENCE type requires entityType field
    
  • Gift Card
    Error: Tax class 'exempt' not found
    → Fix: Ensure tax class 'exempt' exists in your configuration
    → Check: Tax class names must match exactly
    → Run: saleor-configurator introspect --include=taxes

General suggestions:
  1. Review the individual errors above
  2. Fix the issues and run deploy again
  3. Use --include flag to deploy only specific entities
  4. Run 'saleor-configurator diff' to check current state

Run 'saleor-configurator deploy --verbose' for detailed error traces
```

### 11. 🔍 **Channel Reference Errors**

#### Channel Not Found in Listings
**Config:**
```yaml
products:
  - name: "Premium Widget"
    channelListings:
      - channel: "b2b-channel"  # Doesn't exist
        isPublished: true
```

**Error Message:**
```
❌ Channel 'b2b-channel' not found

→ Fix: Ensure channel 'b2b-channel' exists in your channels configuration
→ Check: Run 'saleor-configurator diff --include=channels' to see available channels
→ Run: saleor-configurator introspect --include=channels

Available channels:
  • default-channel
  • us-channel
  • eu-channel

To create the channel, add:
channels:
  - name: "B2B Channel"
    slug: "b2b-channel"
    currencyCode: "USD"
    defaultCountry: "US"
```

### 12. 🏗️ **Configuration File Errors**

#### YAML Syntax Error
**Scenario:** Invalid YAML formatting

**Error Message:**
```
❌ Configuration file error

Failed to parse YAML configuration

Details:
  • file: config.yml
  • line: 45
  • column: 12
  • error: Implicit keys need to be on a single line

→ Fix: Check line 45 in config.yml for formatting issues
→ Check: Ensure proper indentation (2 spaces)
→ Run: yamllint config.yml

Common YAML issues:
  • Use spaces, not tabs
  • Consistent 2-space indentation
  • Quote strings with special characters
  • Lists start with dash and space "- "
```

#### Schema Validation Error
**Scenario:** Config doesn't match expected schema

**Error Message:**
```
❌ Configuration validation failed

Schema mismatch at 'products.0.variants.0'

Details:
  • Expected: object with 'name' and 'sku'
  • Received: string "Small"

→ Fix: Variants must be objects, not strings
→ Check: Review schema documentation
→ Run: cat SCHEMA.md | grep -A 10 "variants"

Correct format:
products:
  - name: "T-Shirt"
    variants:
      - name: "Small"     # ← Object with properties
        sku: "TSHIRT-S"
      - name: "Medium"
        sku: "TSHIRT-M"

Not:
products:
  - name: "T-Shirt"
    variants:
      - "Small"          # ← Plain string (incorrect)
```

## 📊 Summary of Recovery Patterns

Our system now handles **30+ error scenarios** with specific recovery suggestions:

| Error Type | Patterns | Recovery Actions |
|------------|----------|------------------|
| Authentication | 4 | Token validation, permission checks |
| Network | 5 | URL format, connectivity tests |
| Validation | 8 | Field requirements, schema checks |
| Entity Not Found | 6 | Reference lookups, introspect commands |
| Duplicates | 3 | Unique identifier guidance |
| Configuration | 4 | YAML/schema validation |

Each error provides:
1. **What went wrong** - Clear error description
2. **Why it failed** - Root cause explanation
3. **How to fix it** - Step-by-step resolution
4. **Commands to run** - Exact CLI commands
5. **Examples** - Working configuration samples

This comprehensive error handling ensures developers can quickly identify and resolve issues without external help or documentation searches.