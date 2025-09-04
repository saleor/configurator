# Examples and Case Studies

Comprehensive collection of real-world scenarios, complex configurations, troubleshooting case studies, and best practices for the Saleor Configurator. These examples demonstrate practical usage patterns and solutions to common challenges.

## Table of Contents

### Basic Usage Examples
- [First-Time Setup](#first-time-setup)
- [Simple Store Configuration](#simple-store-configuration)
- [Basic Product Catalog](#basic-product-catalog)

### Complex Configuration Examples
- [Multi-Channel E-commerce Store](#multi-channel-e-commerce-store)
- [B2B Marketplace Configuration](#b2b-marketplace-configuration)  
- [International Fashion Retailer](#international-fashion-retailer)

### Migration Case Studies
- [Legacy Store Migration](#legacy-store-migration)
- [Category Structure Reorganization](#category-structure-reorganization)
- [Schema Version Upgrade](#schema-version-upgrade)

### Troubleshooting Case Studies
- [Deployment Failure Recovery](#deployment-failure-recovery)
- [Cross-Entity Reference Issues](#cross-entity-reference-issues)
- [Performance Optimization](#performance-optimization-case-study)

### Advanced Workflow Examples
- [CI/CD Integration](#cicd-integration-example)
- [Multi-Environment Management](#multi-environment-management)
- [Automated Testing Pipeline](#automated-testing-pipeline)

## Basic Usage Examples

### First-Time Setup

**Scenario**: New developer setting up Saleor Configurator for the first time

**Step-by-step Process:**
```bash
# 1. Initial setup
npm install -g @saleor/configurator
cd my-saleor-project

# 2. Interactive setup wizard
saleor-configurator start
# Wizard will prompt for:
# - Saleor instance URL
# - API token
# - Initial configuration preferences

# 3. First introspection
saleor-configurator introspect \
  --url=https://my-store.saleor.cloud/graphql/ \
  --token=my-api-token

# 4. Review generated configuration
cat config.yml

# 5. Make a small test change
# Edit config.yml - change shop name
sed -i 's/defaultMailSenderName: ".*"/defaultMailSenderName: "My Test Store"/' config.yml

# 6. Preview changes
saleor-configurator diff \
  --url=https://my-store.saleor.cloud/graphql/ \
  --token=my-api-token

# 7. Deploy changes
saleor-configurator deploy \
  --url=https://my-store.saleor.cloud/graphql/ \
  --token=my-api-token
```

**Generated Configuration:**
```yaml
# config.yml - Initial setup result
shop:
  defaultMailSenderName: "My Test Store"
  defaultMailSenderAddress: "noreply@mystore.com"
  displayGrossPrices: true
  enabledNotificationPlugins: []

channels:
  - name: "Default Channel"
    slug: "default-channel"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
productTypes:
  - name: "Default"
    isShippingRequired: true
    productAttributes: []
    variantAttributes: []
```

### Simple Store Configuration

**Scenario**: Setting up a basic bookstore with categories and product types

**Configuration:**
```yaml
shop:
  defaultMailSenderName: "Bookstore Central"
  defaultMailSenderAddress: "orders@bookstore.com"
  displayGrossPrices: true

channels:
  - name: "Web Store"
    slug: "web"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
  - name: "Mobile App"
    slug: "mobile"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true

categories:
  - name: "Fiction"
    slug: "fiction"
    description: "Fiction books including novels, short stories"
    
  - name: "Non-Fiction"  
    slug: "non-fiction"
    description: "Educational and reference books"
    
  - name: "Science Fiction"
    slug: "sci-fi"
    parent: "fiction"
    description: "Science fiction and fantasy novels"

productTypes:
  - name: "Book"
    isShippingRequired: true
    productAttributes:
      - name: "Author"
        inputType: "PLAIN_TEXT"
        required: true
      - name: "ISBN"
        inputType: "PLAIN_TEXT"
        required: false
      - name: "Genre"
        inputType: "DROPDOWN"
        values:
          - name: "Mystery"
          - name: "Romance"
          - name: "Thriller"
    variantAttributes:
      - name: "Format"
        inputType: "DROPDOWN"
        values:
          - name: "Hardcover"
          - name: "Paperback"
          - name: "E-book"
```

**Deployment Process:**
```bash
# 1. Validate configuration
saleor-configurator deploy --dry-run \
  --url=https://bookstore.saleor.cloud/graphql/ \
  --token=$BOOKSTORE_TOKEN

# 2. Deploy in stages for safety
# First: Shop and channels
saleor-configurator deploy --include=shop,channels \
  --url=https://bookstore.saleor.cloud/graphql/ \
  --token=$BOOKSTORE_TOKEN

# Then: Categories and product types
saleor-configurator deploy --include=categories,productTypes \
  --url=https://bookstore.saleor.cloud/graphql/ \
  --token=$BOOKSTORE_TOKEN

# 3. Verify deployment
saleor-configurator diff \
  --url=https://bookstore.saleor.cloud/graphql/ \
  --token=$BOOKSTORE_TOKEN
```

### Basic Product Catalog

**Scenario**: Adding products to the bookstore

**Product Configuration:**
```yaml
products:
  - name: "The Great Gatsby"
    slug: "great-gatsby"
    productType: "Book"
    category: "fiction"
    description: "Classic American novel by F. Scott Fitzgerald"
    attributes:
      Author: "F. Scott Fitzgerald"
      ISBN: "978-0-7432-7356-5"
      Genre: "Romance"
    variants:
      - name: "Hardcover Edition"
        sku: "GG-HC-001"
        weight: 0.8
        attributes:
          Format: "Hardcover"
        channelListings:
          - channel: "web"
            price: 24.99
            isPublished: true
          - channel: "mobile" 
            price: 24.99
            isPublished: true
            
      - name: "Paperback Edition"
        sku: "GG-PB-001"
        weight: 0.4
        attributes:
          Format: "Paperback"
        channelListings:
          - channel: "web"
            price: 14.99
            isPublished: true
          - channel: "mobile"
            price: 14.99
            isPublished: true
            
  - name: "Dune"
    slug: "dune-herbert"
    productType: "Book" 
    category: "sci-fi"
    description: "Epic science fiction novel by Frank Herbert"
    attributes:
      Author: "Frank Herbert"
      ISBN: "978-0-441-17271-9"
      Genre: "Thriller"
    variants:
      - name: "Paperback Edition"
        sku: "DUNE-PB-001"
        weight: 0.6
        attributes:
          Format: "Paperback"
        channelListings:
          - channel: "web"
            price: 16.99
            isPublished: true

collections:
  - name: "Staff Picks"
    slug: "staff-picks"
    description: "Books recommended by our staff"
    products: ["great-gatsby", "dune-herbert"]
    channelListings:
      - channel: "web"
        isPublished: true
      - channel: "mobile"
        isPublished: true
```

## Complex Configuration Examples

### Multi-Channel E-commerce Store

**Scenario**: Large retailer with multiple sales channels, complex product catalog, and international presence

**Complete Configuration:**
```yaml
shop:
  defaultMailSenderName: "Global Electronics"
  defaultMailSenderAddress: "orders@globalelectronics.com"
  displayGrossPrices: false # B2B pricing
  trackInventoryByDefault: true
  enabledNotificationPlugins: 
    - "saleor.plugins.webhook"
    - "saleor.plugins.email"

channels:
  - name: "US Retail"
    slug: "us-retail" 
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
  - name: "EU Retail"
    slug: "eu-retail"
    currencyCode: "EUR" 
    defaultCountry: "DE"
    isActive: true
    
  - name: "B2B Wholesale"
    slug: "b2b"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
  - name: "Mobile App"
    slug: "mobile"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true

categories:
  - name: "Electronics"
    slug: "electronics"
    description: "Consumer electronics and gadgets"
    
  - name: "Computers"
    slug: "computers"
    parent: "electronics"
    description: "Desktop and laptop computers"
    
  - name: "Laptops"
    slug: "laptops"
    parent: "computers"
    description: "Portable laptop computers"
    
  - name: "Smartphones"
    slug: "smartphones"
    parent: "electronics" 
    description: "Mobile phones and accessories"
    
  - name: "Audio"
    slug: "audio"
    parent: "electronics"
    description: "Headphones, speakers, audio equipment"

productTypes:
  - name: "Laptop"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        inputType: "DROPDOWN"
        values:
          - name: "Apple"
          - name: "Dell"
          - name: "HP"
          - name: "Lenovo"
      - name: "Operating System"
        inputType: "DROPDOWN"
        values:
          - name: "Windows 11"
          - name: "macOS"
          - name: "Linux"
      - name: "Processor"
        inputType: "PLAIN_TEXT"
      - name: "Screen Size"
        inputType: "DROPDOWN"
        values:
          - name: "13 inch"
          - name: "15 inch"
          - name: "17 inch"
    variantAttributes:
      - name: "RAM"
        inputType: "DROPDOWN"
        values:
          - name: "8GB"
          - name: "16GB"
          - name: "32GB"
      - name: "Storage"
        inputType: "DROPDOWN"
        values:
          - name: "256GB SSD"
          - name: "512GB SSD"
          - name: "1TB SSD"
          
  - name: "Smartphone"
    isShippingRequired: true
    productAttributes:
      - name: "Brand"
        inputType: "DROPDOWN"
        values:
          - name: "Apple"
          - name: "Samsung"
          - name: "Google"
      - name: "Operating System"
        inputType: "DROPDOWN"
        values:
          - name: "iOS"
          - name: "Android"
    variantAttributes:
      - name: "Storage"
        inputType: "DROPDOWN"
        values:
          - name: "64GB"
          - name: "128GB" 
          - name: "256GB"
      - name: "Color"
        inputType: "DROPDOWN"
        values:
          - name: "Black"
          - name: "White"
          - name: "Blue"
          - name: "Red"

products:
  - name: "MacBook Pro 16-inch"
    slug: "macbook-pro-16"
    productType: "Laptop"
    category: "laptops"
    description: "Professional laptop with M3 Pro chip"
    attributes:
      Brand: "Apple"
      "Operating System": "macOS"
      Processor: "Apple M3 Pro"
      "Screen Size": "16 inch"
    variants:
      - name: "16GB RAM, 512GB SSD"
        sku: "MBP16-16-512"
        weight: 2.1
        attributes:
          RAM: "16GB"
          Storage: "512GB SSD"
        channelListings:
          - channel: "us-retail"
            price: 2499.00
            isPublished: true
          - channel: "eu-retail"
            price: 2799.00
            isPublished: true
          - channel: "b2b"
            price: 2249.00
            isPublished: true
            
      - name: "32GB RAM, 1TB SSD"
        sku: "MBP16-32-1TB"
        weight: 2.1
        attributes:
          RAM: "32GB"
          Storage: "1TB SSD"
        channelListings:
          - channel: "us-retail"
            price: 3499.00
            isPublished: true
          - channel: "b2b"
            price: 3149.00
            isPublished: true

collections:
  - name: "Professional Laptops"
    slug: "pro-laptops"
    description: "High-performance laptops for professionals"
    products: ["macbook-pro-16"]
    channelListings:
      - channel: "us-retail"
        isPublished: true
      - channel: "eu-retail" 
        isPublished: true
      - channel: "b2b"
        isPublished: true
        
  - name: "Back to School"
    slug: "back-to-school"
    description: "Essential electronics for students"
    products: ["macbook-pro-16"]
    channelListings:
      - channel: "us-retail"
        isPublished: true
      - channel: "mobile"
        isPublished: true

warehouses:
  - name: "US East Coast"
    slug: "us-east"
    companyName: "Global Electronics"
    email: "warehouse-east@globalelectronics.com"
    address:
      streetAddress1: "123 Warehouse Blvd"
      city: "New York" 
      postalCode: "10001"
      country: "US"
      
  - name: "EU Central"
    slug: "eu-central"
    companyName: "Global Electronics EU"
    email: "warehouse-eu@globalelectronics.com"
    address:
      streetAddress1: "456 Lager Straße"
      city: "Berlin"
      postalCode: "10115"
      country: "DE"
```

**Deployment Strategy:**
```bash
#!/bin/bash
# Complex multi-channel deployment script

echo "🚀 Starting multi-channel deployment..."

# 1. Backup current configuration
cp config.yml "config-backup-$(date +%Y%m%d-%H%M%S).yml"

# 2. Validate complete configuration
echo "📋 Validating configuration..."
saleor-configurator deploy --dry-run \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

# 3. Deploy in dependency order
echo "🏗️ Deploying infrastructure..."
saleor-configurator deploy --include=shop,channels,warehouses \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

echo "📂 Deploying categories..."
saleor-configurator deploy --include=categories \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

echo "🏷️ Deploying product types..."
saleor-configurator deploy --include=productTypes \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

echo "📦 Deploying products..." 
saleor-configurator deploy --include=products \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

echo "🗂️ Deploying collections..."
saleor-configurator deploy --include=collections \
  --url=$SALEOR_URL --token=$SALEOR_TOKEN

# 4. Verify deployment
echo "🔍 Verifying deployment..."
saleor-configurator diff --url=$SALEOR_URL --token=$SALEOR_TOKEN

echo "✅ Multi-channel deployment completed!"
```

### B2B Marketplace Configuration

**Scenario**: B2B marketplace with supplier management and complex pricing

**Advanced Configuration:**
```yaml
shop:
  defaultMailSenderName: "B2B Marketplace"
  defaultMailSenderAddress: "orders@b2bmarketplace.com"
  displayGrossPrices: false
  trackInventoryByDefault: true
  enabledNotificationPlugins:
    - "saleor.plugins.webhook"
    - "saleor.plugins.user"
    - "saleor.plugins.email"
  
channels:
  - name: "Supplier Channel A" 
    slug: "supplier-a"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
  - name: "Supplier Channel B"
    slug: "supplier-b"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true
    
  - name: "Retail Partners"
    slug: "retail"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true

categories:
  - name: "Industrial Equipment"
    slug: "industrial"
    description: "Heavy machinery and industrial equipment"
    
  - name: "Manufacturing Tools"
    slug: "manufacturing"
    parent: "industrial"
    description: "Tools and equipment for manufacturing"
    
  - name: "Office Supplies"
    slug: "office"
    description: "Business and office supplies"

productTypes:
  - name: "Industrial Machine"
    isShippingRequired: true
    productAttributes:
      - name: "Manufacturer"
        inputType: "PLAIN_TEXT"
        required: true
      - name: "Model Number"
        inputType: "PLAIN_TEXT"
        required: true
      - name: "Power Rating"
        inputType: "PLAIN_TEXT"
      - name: "Certification"
        inputType: "MULTISELECT"
        values:
          - name: "CE"
          - name: "UL"
          - name: "ISO 9001"
    variantAttributes:
      - name: "Voltage"
        inputType: "DROPDOWN"
        values:
          - name: "110V"
          - name: "220V"
          - name: "440V"

products:
  - name: "CNC Milling Machine XYZ-500"
    slug: "cnc-xyz-500"
    productType: "Industrial Machine"
    category: "manufacturing"
    description: "High-precision CNC milling machine for manufacturing"
    attributes:
      Manufacturer: "TechMachinery Inc"
      "Model Number": "XYZ-500-PRO"
      "Power Rating": "15 kW"
      Certification: ["CE", "ISO 9001"]
    variants:
      - name: "Standard Voltage"
        sku: "CNC-XYZ-500-110V"
        weight: 2500.0
        attributes:
          Voltage: "110V"
        channelListings:
          - channel: "supplier-a"
            price: 150000.00
            isPublished: true
          - channel: "retail"
            price: 175000.00
            isPublished: true

collections:
  - name: "Supplier A Featured"
    slug: "supplier-a-featured"
    description: "Featured products from Supplier A"
    products: ["cnc-xyz-500"]
    channelListings:
      - channel: "supplier-a"
        isPublished: true
      - channel: "retail"
        isPublished: true

warehouses:
  - name: "Supplier A Warehouse"
    slug: "supplier-a-wh"
    companyName: "Supplier A Manufacturing"
    email: "warehouse@suppliera.com"
    address:
      streetAddress1: "789 Industrial Park"
      city: "Detroit"
      postalCode: "48201"
      country: "US"
```

## Migration Case Studies

### Legacy Store Migration

**Scenario**: Migrating from a legacy e-commerce system to Saleor with existing product data

**Challenge**: 
- 5,000+ products in legacy system
- Inconsistent category structure
- Multiple pricing tiers
- Complex attribute mappings

**Migration Strategy:**

**Phase 1: Data Analysis and Mapping**
```bash
# 1. Export legacy data
legacy-export --format=csv --include=products,categories,attributes

# 2. Analyze data structure
python analyze_legacy_data.py legacy_export.csv

# 3. Create mapping configuration
cat > migration_mapping.yml << 'EOF'
category_mapping:
  "Electronics > Computers > Laptops": "laptops"
  "Electronics > Phones": "smartphones"
  "Books > Fiction > Sci-Fi": "sci-fi"

attribute_mapping:
  "Item Brand": "Brand"
  "Item Model": "Model"
  "Screen Size (inches)": "Screen Size"
  
price_tier_mapping:
  "retail": "us-retail"
  "wholesale": "b2b"
  "international": "eu-retail"
EOF
```

**Phase 2: Configuration Generation**
```python
# migration_script.py
import csv
import yaml

def migrate_legacy_data(legacy_file, mapping_file):
    with open(mapping_file, 'r') as f:
        mappings = yaml.safe_load(f)
    
    # Generate Saleor configuration
    saleor_config = {
        'categories': [],
        'productTypes': [],
        'products': []
    }
    
    # Process legacy data
    with open(legacy_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Map categories
            legacy_category = row['category']
            saleor_category = mappings['category_mapping'].get(legacy_category)
            
            # Map attributes
            attributes = {}
            for legacy_attr, saleor_attr in mappings['attribute_mapping'].items():
                if row.get(legacy_attr):
                    attributes[saleor_attr] = row[legacy_attr]
            
            # Create product configuration
            product = {
                'name': row['name'],
                'slug': generate_slug(row['name']),
                'category': saleor_category,
                'attributes': attributes,
                # ... more mapping logic
            }
            
            saleor_config['products'].append(product)
    
    return saleor_config

# Execute migration
migrated_config = migrate_legacy_data('legacy_export.csv', 'migration_mapping.yml')

with open('migrated_config.yml', 'w') as f:
    yaml.dump(migrated_config, f, default_flow_style=False)
```

**Phase 3: Staged Migration**
```bash
# 1. Create test environment
saleor-configurator introspect \
  --url=$TEST_URL --token=$TEST_TOKEN \
  --config=test_baseline.yml

# 2. Deploy categories first
saleor-configurator deploy --include=categories \
  --url=$TEST_URL --token=$TEST_TOKEN \
  --config=migrated_config.yml

# 3. Deploy product types
saleor-configurator deploy --include=productTypes \
  --url=$TEST_URL --token=$TEST_TOKEN \
  --config=migrated_config.yml

# 4. Deploy products in batches
split -l 100 migrated_products.yml batch_
for batch in batch_*; do
  echo "Deploying batch: $batch"
  saleor-configurator deploy --include=products \
    --url=$TEST_URL --token=$TEST_TOKEN \
    --config=$batch
  sleep 30  # Rate limiting
done

# 5. Validation
saleor-configurator diff \
  --url=$TEST_URL --token=$TEST_TOKEN \
  --config=migrated_config.yml
```

**Phase 4: Production Migration**
```bash
# Production migration with rollback plan
#!/bin/bash

echo "🚀 Starting production migration..."

# Backup
echo "📦 Creating backup..."
saleor-configurator introspect \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --config="backup-$(date +%Y%m%d).yml"

# Deploy with monitoring
echo "📊 Starting monitored deployment..."
saleor-configurator deploy \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --config=migrated_config.yml \
  --backup \
  --monitor

echo "✅ Migration completed successfully"
```

### Category Structure Reorganization

**Scenario**: Reorganizing category hierarchy based on analytics and user behavior

**Original Structure:**
```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    
  - name: "Computer Hardware"
    slug: "computer-hardware"
    parent: "electronics"
    
  - name: "Laptops"
    slug: "laptops"
    parent: "computer-hardware"
    
  - name: "Desktop PCs" 
    slug: "desktops"
    parent: "computer-hardware"
```

**New Structure:**
```yaml
categories:
  - name: "Computers & Tech"
    slug: "computers-tech"
    
  - name: "Laptops & Notebooks"
    slug: "laptops"
    parent: "computers-tech"
    
  - name: "Desktop Computers"
    slug: "desktop-computers"
    parent: "computers-tech"
    
  - name: "Gaming Laptops"
    slug: "gaming-laptops"
    parent: "laptops"
    
  - name: "Business Laptops"
    slug: "business-laptops" 
    parent: "laptops"
```

**Migration Process:**
```bash
# 1. Analyze impact of changes
echo "📊 Analyzing category changes impact..."

# Check which products will be affected
saleor-configurator analyze-impact \
  --old-config=current_config.yml \
  --new-config=new_structure.yml \
  --report=impact_report.json

# 2. Create migration plan with URL redirects
cat > category_migration_plan.yml << 'EOF'
migrations:
  - from: "electronics/computer-hardware/laptops"
    to: "computers-tech/laptops"
    redirect_needed: true
    
  - from: "electronics/computer-hardware/desktops"
    to: "computers-tech/desktop-computers"
    redirect_needed: true

products_to_update:
  - slug: "macbook-pro-16"
    old_category: "laptops"
    new_category: "business-laptops"
    
  - slug: "gaming-asus-rog"
    old_category: "laptops" 
    new_category: "gaming-laptops"
EOF

# 3. Execute migration
saleor-configurator migrate-categories \
  --plan=category_migration_plan.yml \
  --url=$PROD_URL --token=$PROD_TOKEN
```

### Schema Version Upgrade

**Scenario**: Upgrading from configurator v0.12 to v1.0 with breaking changes

**Migration Requirements:**
- Categories now require slug field
- Product identification changed from name to slug
- New required fields added

**Migration Process:**
```bash
# 1. Check current version compatibility
saleor-configurator check-compatibility \
  --config=config.yml \
  --target-version=1.0

# 2. Run migration wizard
saleor-configurator migrate \
  --from=0.12 --to=1.0 \
  --config=config.yml \
  --interactive

# Migration wizard output:
# ⚠️  Breaking changes detected:
# - Categories missing slug field (12 categories)
# - Products using name-based identification
# 
# 🔧 Auto-fixes available:
# ✅ Generate slugs for categories
# ✅ Update product references to use slugs
# ✅ Add default values for new required fields
#
# Apply auto-fixes? [y/N]: y

# 3. Review migrated configuration
diff config.yml config_migrated.yml

# 4. Test migration in development
cp config_migrated.yml config.yml
saleor-configurator deploy --dry-run \
  --url=$DEV_URL --token=$DEV_TOKEN

# 5. Apply to production
saleor-configurator deploy \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --backup
```

## Troubleshooting Case Studies

### Deployment Failure Recovery

**Scenario**: Large deployment fails halfway through due to network issues

**Problem**: Deployment of 500 products fails after 200 successful deployments

**Error Message:**
```
❌ Deployment failed at product #201: Network timeout
💾 Partial deployment state saved to: deployment_state_20240315_1430.json
🔄 Rollback initiated for 200 completed operations...
```

**Recovery Process:**
```bash
# 1. Assess current state
saleor-configurator status \
  --deployment-id=deployment_20240315_1430

echo "📊 Deployment Status:
✅ Completed: 200 products
❌ Failed: 1 product (network timeout)
⏳ Pending: 299 products
💾 State file: deployment_state_20240315_1430.json"

# 2. Check system status
echo "🔍 Checking Saleor instance status..."
curl -I https://store.saleor.cloud/graphql/
# HTTP/2 200 OK - System is up

# 3. Resume deployment from failure point
saleor-configurator resume-deployment \
  --state-file=deployment_state_20240315_1430.json \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --retry-failed

# Alternative: Deploy remaining items only
saleor-configurator deploy \
  --config=config.yml \
  --skip-completed=deployment_state_20240315_1430.json \
  --url=$PROD_URL --token=$PROD_TOKEN

# 4. Verify final state
saleor-configurator diff \
  --url=$PROD_URL --token=$PROD_TOKEN

echo "✅ Recovery completed: 500/500 products deployed"
```

### Cross-Entity Reference Issues

**Scenario**: Products referencing non-existent categories causing deployment failure

**Problem Configuration:**
```yaml
categories:
  - name: "Electronics"
    slug: "electronics"

products:
  - name: "Laptop Pro"
    slug: "laptop-pro"
    category: "laptops"  # ❌ Category doesn't exist
    productType: "Laptop"
    
  - name: "Gaming Mouse"
    slug: "gaming-mouse"
    category: "accessories"  # ❌ Category doesn't exist
    productType: "Accessory"
```

**Error Analysis:**
```bash
# 1. Run validation to identify issues
saleor-configurator validate --config=config.yml

echo "❌ Validation Errors Found:
- Product 'laptop-pro' references unknown category 'laptops'
- Product 'gaming-mouse' references unknown category 'accessories'
- ProductType 'Laptop' not defined
- ProductType 'Accessory' not defined"

# 2. Auto-fix reference issues
saleor-configurator fix-references \
  --config=config.yml \
  --output=config_fixed.yml \
  --interactive

# Interactive fixes:
# 🔍 Found reference issues:
# 
# Product 'laptop-pro' → category 'laptops'
# Available categories: electronics
# Options:
# 1. Create missing category 'laptops'
# 2. Change reference to 'electronics' 
# 3. Remove category reference
# Choice [1]: 1
#
# Product 'gaming-mouse' → category 'accessories'
# Options:
# 1. Create missing category 'accessories'
# 2. Change reference to 'electronics'
# 3. Remove category reference  
# Choice [1]: 1
```

**Fixed Configuration:**
```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    
  - name: "Laptops"  # ✅ Auto-generated
    slug: "laptops"
    parent: "electronics"
    
  - name: "Accessories"  # ✅ Auto-generated
    slug: "accessories"  
    parent: "electronics"

productTypes:  # ✅ Auto-generated
  - name: "Laptop"
    isShippingRequired: true
    
  - name: "Accessory"
    isShippingRequired: true

products:
  - name: "Laptop Pro"
    slug: "laptop-pro"
    category: "laptops"  # ✅ Now valid
    productType: "Laptop"
    
  - name: "Gaming Mouse"
    slug: "gaming-mouse"
    category: "accessories"  # ✅ Now valid
    productType: "Accessory"
```

### Performance Optimization Case Study

**Scenario**: Large configuration deployment takes too long and times out

**Initial Problem:**
```bash
# Slow deployment - 2000 products taking 45+ minutes
time saleor-configurator deploy \
  --url=$PROD_URL --token=$PROD_TOKEN

# Result: 
# real    47m32.123s
# user    2m15.456s  
# sys     0m42.789s
# ❌ Several timeout errors
```

**Performance Analysis:**
```bash
# 1. Profile current deployment
saleor-configurator deploy --profile \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --output=performance_profile.json

# 2. Analyze bottlenecks
saleor-configurator analyze-performance \
  --profile=performance_profile.json

echo "📊 Performance Analysis:
🐌 Bottlenecks identified:
- GraphQL query N+1 problem: 2000 individual requests
- No request batching: Each product = 1 request
- Large payload sizes: Average 15KB per request
- No parallel processing: Sequential execution
- Network latency: 200ms average per request

💡 Recommendations:
- Enable request batching (10x improvement)
- Implement parallel processing (3x improvement)  
- Optimize GraphQL queries (2x improvement)
- Add request compression (1.5x improvement)
- Expected total improvement: 90x faster"
```

**Optimization Implementation:**
```bash
# 1. Enable performance optimizations
cat > .saleor-config.yml << 'EOF'
performance:
  batch_size: 20
  parallel_workers: 5
  enable_compression: true
  request_timeout: 30
  optimize_queries: true
  use_graphql_batching: true
EOF

# 2. Deploy with optimizations
time saleor-configurator deploy \
  --url=$PROD_URL --token=$PROD_TOKEN \
  --config-file=.saleor-config.yml

# Result:
# real    3m12.456s
# user    1m45.123s
# sys     0m22.333s
# ✅ 15x improvement (not quite 90x, but significant)

# 3. Monitor deployment
saleor-configurator deploy --monitor \
  --url=$PROD_URL --token=$PROD_TOKEN

echo "📊 Real-time metrics:
⚡ Operations/sec: 12.5 (was 0.7)
🌐 Avg response time: 45ms (was 200ms)
📦 Batch efficiency: 95%
✅ Success rate: 100%"
```

## Advanced Workflow Examples

### CI/CD Integration Example

**Scenario**: Complete CI/CD pipeline with automated testing and deployment

**GitHub Actions Workflow:**
```yaml
# .github/workflows/saleor-deployment.yml
name: Saleor Configuration Deployment

on:
  push:
    branches: [main]
    paths: ['config.yml', 'configs/**']
  pull_request:
    branches: [main]
    paths: ['config.yml', 'configs/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Saleor Configurator
        run: npm install -g @saleor/configurator
        
      - name: Validate Configuration
        run: |
          saleor-configurator validate --config=config.yml
          saleor-configurator check-references --config=config.yml
          
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Scan for Secrets
        run: |
          saleor-configurator scan-secrets --config=config.yml
          saleor-configurator check-sensitive-data --config=config.yml

  test-deployment:
    needs: [validate, security-scan]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Staging
        env:
          SALEOR_URL: ${{ secrets.STAGING_SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.STAGING_SALEOR_TOKEN }}
        run: |
          # Test deployment
          saleor-configurator deploy --dry-run \
            --url=$SALEOR_URL --token=$SALEOR_TOKEN
          
          # Execute deployment
          saleor-configurator deploy \
            --url=$SALEOR_URL --token=$SALEOR_TOKEN \
            --ci --backup
            
      - name: Integration Tests
        env:
          SALEOR_URL: ${{ secrets.STAGING_SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.STAGING_SALEOR_TOKEN }}
        run: |
          # Verify deployment
          saleor-configurator diff --url=$SALEOR_URL --token=$SALEOR_TOKEN
          
          # Run integration tests
          npm run test:integration

  deploy-production:
    needs: [test-deployment]
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Production
        env:
          SALEOR_URL: ${{ secrets.PROD_SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.PROD_SALEOR_TOKEN }}
        run: |
          # Production deployment with extra safety
          saleor-configurator deploy \
            --url=$SALEOR_URL --token=$SALEOR_TOKEN \
            --ci --backup --monitor --rollback-on-failure
            
      - name: Post-deployment Verification
        env:
          SALEOR_URL: ${{ secrets.PROD_SALEOR_URL }}
          SALEOR_TOKEN: ${{ secrets.PROD_SALEOR_TOKEN }}
        run: |
          # Health check
          saleor-configurator health-check --url=$SALEOR_URL --token=$SALEOR_TOKEN
          
          # Smoke tests
          npm run test:smoke-production
          
      - name: Notify Success
        uses: 8398a7/action-slack@v3
        with:
          status: success
          text: '🚀 Saleor configuration deployed to production successfully!'
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Multi-Environment Management

**Scenario**: Managing configurations across development, staging, and production environments

**Environment Structure:**
```
configs/
├── base.yml           # Common configuration
├── development.yml    # Dev overrides
├── staging.yml        # Staging overrides  
├── production.yml     # Prod overrides
└── secrets/
    ├── dev-secrets.yml
    ├── staging-secrets.yml
    └── prod-secrets.yml
```

**Base Configuration:**
```yaml
# configs/base.yml
shop:
  displayGrossPrices: true
  trackInventoryByDefault: true

channels:
  - name: "Default"
    slug: "default"
    currencyCode: "USD"
    defaultCountry: "US"
    isActive: true

categories:
  - name: "Electronics"
    slug: "electronics"
    
productTypes:
  - name: "Device"
    isShippingRequired: true
```

**Environment-Specific Configurations:**
```yaml
# configs/development.yml
shop:
  defaultMailSenderName: "Dev Store"
  defaultMailSenderAddress: "dev@example.com"

# configs/staging.yml  
shop:
  defaultMailSenderName: "Staging Store"
  defaultMailSenderAddress: "staging@example.com"
  
channels:
  - name: "Staging Channel"
    slug: "staging"
    currencyCode: "USD"

# configs/production.yml
shop:
  defaultMailSenderName: "Production Store"
  defaultMailSenderAddress: "orders@store.com"
  
channels:
  - name: "Web Store"
    slug: "web"
  - name: "Mobile App"
    slug: "mobile"
```

**Environment Management Script:**
```bash
#!/bin/bash
# deploy-environment.sh

ENVIRONMENT=$1
if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment>"
    echo "Environments: development, staging, production"
    exit 1
fi

echo "🚀 Deploying to $ENVIRONMENT environment..."

# 1. Merge configurations
saleor-configurator merge-config \
  --base=configs/base.yml \
  --overlay=configs/$ENVIRONMENT.yml \
  --secrets=configs/secrets/$ENVIRONMENT-secrets.yml \
  --output=config-$ENVIRONMENT.yml

# 2. Validate merged configuration
saleor-configurator validate --config=config-$ENVIRONMENT.yml

# 3. Get environment-specific credentials
case $ENVIRONMENT in
  development)
    URL=$DEV_SALEOR_URL
    TOKEN=$DEV_SALEOR_TOKEN
    ;;
  staging)
    URL=$STAGING_SALEOR_URL
    TOKEN=$STAGING_SALEOR_TOKEN
    ;;
  production)
    URL=$PROD_SALEOR_URL
    TOKEN=$PROD_SALEOR_TOKEN
    ;;
esac

# 4. Deploy to environment
saleor-configurator deploy \
  --config=config-$ENVIRONMENT.yml \
  --url=$URL --token=$TOKEN \
  --environment=$ENVIRONMENT

# 5. Verify deployment
saleor-configurator diff \
  --config=config-$ENVIRONMENT.yml \
  --url=$URL --token=$TOKEN

# 6. Run environment-specific tests
npm run test:$ENVIRONMENT

echo "✅ $ENVIRONMENT deployment completed successfully!"
```

### Automated Testing Pipeline

**Scenario**: Comprehensive testing pipeline for configuration changes

**Test Configuration:**
```javascript
// tests/config-tests.js
const { describe, test, expect } = require('@jest/globals');
const { SaleorConfigurator } = require('@saleor/configurator');

describe('Configuration Tests', () => {
  let configurator;
  
  beforeAll(async () => {
    configurator = new SaleorConfigurator({
      url: process.env.TEST_SALEOR_URL,
      token: process.env.TEST_SALEOR_TOKEN
    });
  });

  describe('Schema Validation', () => {
    test('should validate all configurations', async () => {
      const configs = [
        'configs/development.yml',
        'configs/staging.yml', 
        'configs/production.yml'
      ];
      
      for (const config of configs) {
        const result = await configurator.validate(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }
    });
    
    test('should detect missing references', async () => {
      const badConfig = {
        products: [{
          name: "Test Product",
          category: "nonexistent-category"
        }]
      };
      
      const result = await configurator.validate(badConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          type: 'missing_reference',
          field: 'category'
        })
      );
    });
  });

  describe('Deployment Tests', () => {
    test('should deploy successfully to test environment', async () => {
      const result = await configurator.deploy({
        config: 'configs/development.yml',
        dryRun: false
      });
      
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should be idempotent', async () => {
      // Deploy twice - second should show no changes
      await configurator.deploy({ 
        config: 'configs/development.yml' 
      });
      
      const diff = await configurator.diff({
        config: 'configs/development.yml'
      });
      
      expect(diff.hasChanges).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should deploy large configuration within time limit', async () => {
      const startTime = Date.now();
      
      await configurator.deploy({
        config: 'configs/large-catalog.yml'
      });
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(300000); // 5 minutes max
    });
  });
});
```

**Integration Test Script:**
```bash
#!/bin/bash
# run-integration-tests.sh

echo "🧪 Running Saleor Configuration Integration Tests"

# 1. Setup test environment
echo "🏗️ Setting up test environment..."
saleor-configurator introspect \
  --url=$TEST_URL --token=$TEST_TOKEN \
  --config=test-baseline.yml

# 2. Run configuration validation tests
echo "✅ Running validation tests..."
npm run test:validate

# 3. Run deployment tests
echo "🚀 Running deployment tests..."
npm run test:deploy

# 4. Run performance tests  
echo "⚡ Running performance tests..."
npm run test:performance

# 5. Run security tests
echo "🔒 Running security tests..."
npm run test:security

# 6. Clean up test environment
echo "🧹 Cleaning up..."
saleor-configurator deploy \
  --config=test-baseline.yml \
  --url=$TEST_URL --token=$TEST_TOKEN

echo "✅ All integration tests passed!"
```

**Monitoring and Alerting Setup:**
```bash
#!/bin/bash
# setup-monitoring.sh

# 1. Configure health checks
cat > monitoring/health-check.yml << 'EOF'
health_checks:
  - name: "Configuration Sync"
    type: "config_diff"
    schedule: "*/30 * * * *"  # Every 30 minutes
    environments: ["staging", "production"]
    alert_on: "drift_detected"
    
  - name: "Deployment Success Rate"
    type: "metric"
    schedule: "0 9 * * *"     # Daily at 9 AM
    threshold: "success_rate < 95%"
    alert_channels: ["slack", "email"]
    
  - name: "Performance Monitoring"
    type: "performance"
    schedule: "*/15 * * * *"  # Every 15 minutes
    thresholds:
      deployment_time: "> 10 minutes"
      error_rate: "> 5%"
EOF

# 2. Setup alerting
saleor-configurator setup-monitoring \
  --config=monitoring/health-check.yml \
  --slack-webhook=$SLACK_WEBHOOK \
  --email=$ADMIN_EMAIL

echo "📊 Monitoring and alerting configured successfully!"
```

---

This comprehensive examples guide demonstrates practical applications of all the concepts covered in the other documentation files. Each example includes real configuration files, command-line procedures, and troubleshooting approaches that developers can use as templates for their own Saleor Configurator implementations.

**Related Documentation:**
- [COMMANDS.md](COMMANDS.md) - CLI command syntax used in examples
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Troubleshooting procedures demonstrated in case studies
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment architecture used in complex examples
- [SECURITY_PATTERNS.md](SECURITY_PATTERNS.md) - Security practices demonstrated in CI/CD examples
- [CLAUDE.md](CLAUDE.md) - Main navigation hub