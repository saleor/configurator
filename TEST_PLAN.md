# Saleor Configurator Test Plan

This test plan defines the critical workflows to validate after any code changes to ensure the configurator maintains its integrity.

## Core Testing Workflow

After making any changes to the codebase, execute this complete workflow to ensure everything works correctly:

```bash
# 1. Clean start - remove any existing configuration
rm -rf config.yml

# 2. Introspect from remote
pnpm run introspect --url <SALEOR_URL> --token <SALEOR_TOKEN>

# 3. Make critical data changes (see scenarios below)
# Edit config.yml with various test scenarios

# 4. Deploy the changes
pnpm run deploy --url <SALEOR_URL> --token <SALEOR_TOKEN> --ci

# 5. Deploy again to ensure idempotency (should show no differences)
pnpm run deploy --url <SALEOR_URL> --token <SALEOR_TOKEN> --ci

# 6. Clean configuration again
rm -rf config.yml

# 7. Introspect again - should retrieve what was deployed
pnpm run introspect --url <SALEOR_URL> --token <SALEOR_TOKEN>

# 8. Verify the introspected config matches what was deployed
pnpm run diff --url <SALEOR_URL> --token <SALEOR_TOKEN>
# Should show no differences
```

## Critical Data Change Scenarios

### Scenario 1: Entity Name vs Slug Handling
Test that entities with same names but different slugs are handled correctly:

```yaml
# Add categories with same name but different slugs
categories:
  - name: "Accessories"
    slug: "accessories"
  - name: "Accessories" 
    slug: "accessories-2"
    
# Add channels with different names but verify slug-based identification
channels:
  - name: "European Store"
    slug: "eu-store"
    currencyCode: EUR
    defaultCountry: DE
```

### Scenario 2: Nested Entity Relationships
Test parent-child relationships and nested structures:

```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    subcategories:
      - name: "Computers"
        slug: "computers"
        subcategories:
          - name: "Laptops"
            slug: "laptops"
          - name: "Desktops"
            slug: "desktops"
```

### Scenario 3: Shared Attributes Across Types
Test attribute reuse and deduplication:

```yaml
productTypes:
  - name: "Digital Product"
    productAttributes:
      - name: "License Type"
        inputType: DROPDOWN
        values:
          - name: "Personal"
          - name: "Commercial"
  - name: "Software"
    productAttributes:
      - name: "License Type"  # Same attribute, should be reused
        inputType: DROPDOWN
        values:
          - name: "Personal"
          - name: "Commercial"
```

### Scenario 4: Field Updates and Tracking
Test that all fields are properly tracked for changes:

```yaml
# Modify various fields to ensure tracking
shop:
  defaultMailSenderName: "Updated Store Name"
  displayGrossPrices: false  # Toggle boolean fields
  trackInventoryByDefault: true

channels:
  - name: "Main Channel"
    slug: "default-channel"
    isActive: false  # Test isActive tracking
    currencyCode: EUR  # Change currency
    settings:
      automaticallyConfirmAllNewOrders: true
      allowUnpaidOrders: false
```

### Scenario 5: Complex Product Configuration
Test product creation with variants and attributes:

```yaml
products:
  - name: "Test Product"
    slug: "test-product"
    productType: "Simple Product"
    category: "Electronics"
    attributes:
      Brand: "TestBrand"
      Color: "Blue"
    variants:
      - name: "Small"
        sku: "TEST-S"
        weight: 0.5
      - name: "Large"
        sku: "TEST-L"
        weight: 1.0
```

## Test Validation Points

After each workflow execution, verify:

1. **Introspection Completeness**
   - All entities are captured with their slugs
   - Nested relationships are preserved
   - Settings and metadata are included

2. **Deployment Idempotency**
   - First deployment applies all changes
   - Second deployment shows "No changes detected"
   - No duplicate entities are created

3. **Round-trip Integrity**
   - Introspect → Deploy → Introspect produces identical configs
   - No data loss or corruption occurs

4. **Error Handling**
   - Invalid configurations produce clear error messages
   - Network/auth failures are handled gracefully
   - Partial failures don't corrupt state

## Selective Testing Scenarios

### Selective Operations Testing

Test that selective include/exclude flags work correctly:

```bash
# Test selective introspection with --include
rm -f config.yml
pnpm run introspect --url <SALEOR_URL> --token <SALEOR_TOKEN> --include shop,channels
# Verify: config.yml should only contain shop and channels sections

# Test selective introspection with --exclude  
rm -f config.yml
pnpm run introspect --url <SALEOR_URL> --token <SALEOR_TOKEN> --exclude productTypes,pageTypes
# Verify: config.yml should contain all sections except productTypes and pageTypes

# Test selective deployment
pnpm run deploy --url <SALEOR_URL> --token <SALEOR_TOKEN> --include shop --ci
# Verify: Only shop settings are deployed
```

## Bug-Specific Regression Tests

### 1. Channel isActive Field Tracking
```yaml
# Modify channel isActive field and verify it's tracked
channels:
  - name: "Default Channel"
    slug: "default-channel"
    isActive: false  # Change this value
    
# Run diff - should show isActive change
pnpm run diff --url <SALEOR_URL> --token <SALEOR_TOKEN>
```

### 2. Attribute Deduplication
```yaml
# Deploy product types with shared attributes
# Should reuse existing attributes, not create duplicates
productTypes:
  - name: "Type A"
    productAttributes:
      - name: "Shared Attribute"
        inputType: PLAIN_TEXT
  - name: "Type B"  
    productAttributes:
      - name: "Shared Attribute"  # Same attribute
        inputType: PLAIN_TEXT
```

### 3. Page Type Attributes
```yaml
# Add/remove attributes from page types
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "Author"
        inputType: PLAIN_TEXT
      - name: "Tags"
        inputType: MULTISELECT
        values:
          - name: "Tech"
          - name: "Business"
```

### 4. Category Hierarchy Changes
```yaml
# Test moving categories between parents
categories:
  - name: "Parent A"
    slug: "parent-a"
    subcategories:
      - name: "Child"  # Move this to Parent B
        slug: "child"
  - name: "Parent B"
    slug: "parent-b"
    subcategories: []
```

## Error Scenario Testing

### Authentication Errors
```bash
# Test with invalid token
pnpm run deploy --url <SALEOR_URL> --token INVALID_TOKEN --ci
# Expected: Clear authentication error with suggested actions
```

### Network Errors
```bash
# Test with invalid URL
pnpm run deploy --url https://invalid-store.saleor.cloud --token <TOKEN> --ci
# Expected: Clear network error with troubleshooting steps
```

### Validation Errors
```bash
# Test with malformed config
echo "invalid: yaml: - syntax" > config.yml
pnpm run deploy --url <SALEOR_URL> --token <SALEOR_TOKEN> --ci
# Expected: Clear YAML parsing error with line numbers
```

## Performance Testing

### Large Configuration Handling
```bash
# Create config with many entities
categories: # 50+ categories with nested subcategories
productTypes: # 20+ product types with attributes
channels: # 5+ channels with different settings

# Deploy and measure time
time pnpm run deploy --url <SALEOR_URL> --token <SALEOR_TOKEN> --ci
# Should complete within reasonable time (< 2 minutes)
```

## Notes

- Always test with `--ci` flag for non-interactive mode in scripts
- Check `deployment-report-*.json` files for detailed logs
- Use generic `<SALEOR_URL>` and `<SALEOR_TOKEN>` placeholders in examples
- Test both create/update/delete operations for all entity types
- Verify slug-based identification works correctly for all entities