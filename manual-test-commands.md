# Manual Testing Commands for Deploy Feature

## Setup - Your Saleor Instance
- URL: https://store-rzalldyg.saleor.cloud/graphql/
- Token: YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

## Step 1: Initial Configuration Setup

First, create a test configuration file:

```bash
cat > test-config.yml << 'EOF'
shop:
  name: "Test Shop"
  defaultMailSenderName: "Test Store"
  defaultMailSenderAddress: "noreply@example.com"

channels:
  - name: "United States"
    slug: "default-channel"
    currencyCode: "USD"
    defaultCountry: "US"

productTypes:
  - name: "Digital Product"
    slug: "digital-product"
    isShippingRequired: false
    hasVariants: true
    isDigital: true
    productAttributes:
      - name: "Format"
        slug: "format"
        inputType: "DROPDOWN"
        values:
          - name: "PDF"
          - name: "EPUB"
          - name: "MOBI"

  - name: "Physical Product"
    slug: "physical-product"
    isShippingRequired: true
    hasVariants: true
    weight: "KG"
    productAttributes:
      - name: "Material"
        slug: "material"
        inputType: "MULTISELECT"
        values:
          - name: "Cotton"
          - name: "Polyester"
          - name: "Wool"

categories:
  - name: "Books"
    slug: "books"
  - name: "Clothing"
    slug: "clothing"
EOF
```

## Step 2: First Deployment (Creating Entities)

Deploy the initial configuration:

```bash
# Basic deploy - will show diff and ask for confirmation
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config.yml

# The report will be saved as: deployment-report-YYYY-MM-DD_HH-MM-SS.json
```

## Step 3: Update Configuration (Testing Change Tracking)

Now modify the configuration to see old->new value changes:

```bash
cat > test-config-updated.yml << 'EOF'
shop:
  name: "Updated Test Shop"  # Changed
  defaultMailSenderName: "Updated Store Name"  # Changed
  defaultMailSenderAddress: "support@example.com"  # Changed

channels:
  - name: "United States"
    slug: "default-channel"
    currencyCode: "EUR"  # Changed from USD
    defaultCountry: "DE"  # Changed from US

productTypes:
  - name: "Digital Product"
    slug: "digital-product"
    isShippingRequired: true  # Changed from false
    hasVariants: true
    isDigital: false  # Changed from true
    productAttributes:
      - name: "Format"
        slug: "format"
        inputType: "DROPDOWN"
        values:
          - name: "PDF"
          - name: "EPUB"
          - name: "MOBI"
          - name: "AZW3"  # Added new value

  - name: "Physical Product"
    slug: "physical-product"
    isShippingRequired: true
    hasVariants: false  # Changed from true
    weight: "LB"  # Changed from KG
    productAttributes:
      - name: "Material"
        slug: "material"
        inputType: "DROPDOWN"  # Changed from MULTISELECT
        values:
          - name: "Cotton"
          - name: "Polyester"
          - name: "Wool"
          - name: "Silk"  # Added new value

categories:
  - name: "Books"
    slug: "books"
  - name: "Clothing"
    slug: "clothing"
  - name: "Electronics"  # Added new category
    slug: "electronics"
EOF
```

Deploy the updated configuration:

```bash
# Deploy with changes - will show old->new values
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config-updated.yml
```

## Step 4: Test Custom Report Path

```bash
# Deploy with custom report path
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config-updated.yml \
  --report-path my-custom-deployment-report.json
```

## Step 5: Test CI Mode

```bash
# CI mode - no confirmations, automatic deployment
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config.yml \
  --ci

# CI mode with quiet output
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config.yml \
  --ci \
  --quiet
```

## Step 6: Test Destructive Operations

Create a configuration that removes entities:

```bash
cat > test-config-destructive.yml << 'EOF'
shop:
  name: "Test Shop"
  defaultMailSenderName: "Test Store"
  defaultMailSenderAddress: "noreply@example.com"

channels:
  - name: "United States"
    slug: "default-channel"
    currencyCode: "USD"
    defaultCountry: "US"

# productTypes section removed - this will show deletion warnings
# Removed categories - this will show deletion warnings
EOF
```

Deploy with destructive changes:

```bash
# This will show deletion warnings and require explicit confirmation
configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config test-config-destructive.yml
```

## Step 7: Verify Reports

Check the generated reports:

```bash
# List all deployment reports
ls -la deployment-report-*.json

# View a report (replace with actual filename)
cat deployment-report-2024-01-15_10-30-00.json | jq .

# Check specific changes in a report
cat deployment-report-2024-01-15_10-30-00.json | jq '.changes[] | select(.operation == "UPDATE")'

# Check timing metrics
cat deployment-report-2024-01-15_10-30-00.json | jq '.stages[] | {name, durationFormatted}'
```

## Expected Outputs

### 1. Initial Deployment
You should see:
- Creation of shop settings
- Creation of 2 channels
- Creation of 2 product types with attributes
- Creation of 2 categories

### 2. Update Deployment
You should see changes like:
```
📋 Configuration Changes
─────────────────────────────────────────

🏪 Shop Settings
──
  📝 Update: "Shop Settings"
    └─ name: "Test Shop" → "Updated Test Shop"
    └─ defaultMailSenderName: "Test Store" → "Updated Store Name"
    └─ defaultMailSenderAddress: "noreply@example.com" → "support@example.com"

💰 Channels
──
  📝 Update: "United States"
    └─ currencyCode: "USD" → "EUR"
    └─ defaultCountry: "US" → "DE"

📦 Product Types
──
  📝 Update: "Digital Product"
    └─ isShippingRequired: false → true
    └─ isDigital: true → false
  
  📝 Update: "Physical Product"
    └─ hasVariants: true → false
    └─ weight: "KG" → "LB"

🏷️ Categories
──
  ✅ Create: "Electronics"
```

### 3. Deployment Report
The JSON report will contain all these changes with exact old/new values, timing metrics, and entity counts.

## Troubleshooting

If you encounter errors:

1. **Authentication Error**: Verify your token is correct
2. **Network Error**: Check the URL includes `/graphql/`
3. **Validation Error**: Check your YAML syntax
4. **Permission Error**: Ensure your token has write permissions

## Quick Test Commands

```bash
# Quick test with minimal config
echo 'shop:
  name: "Quick Test"' > quick-test.yml

configurator deploy \
  --url https://store-rzalldyg.saleor.cloud/graphql/ \
  --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs \
  --config quick-test.yml
```