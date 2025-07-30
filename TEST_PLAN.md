# Comprehensive Test Plan for Saleor Configurator

This test plan covers all the bug fixes and improvements made across multiple PRs.

## Prerequisites
- Store URL: `https://store-rzalldyg.saleor.cloud`
- Token: `YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs`

## Test Scenarios

### 1. Test Bug #9 Fix: Selective Include/Exclude Flags
```bash
# Clean start
rm -f config.yml

# Test selective introspection with --include
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --include shop
# Verify: config.yml should only contain shop section

# Test selective introspection with --exclude
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --exclude productTypes,pageTypes
# Verify: config.yml should contain shop, channels, categories but NOT productTypes or pageTypes
```

### 2. Test Bug #5 Fix: Channel isActive Field Tracking
```bash
# Full introspection
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Modify channel isActive field
# Edit config.yml and change isActive for any channel:
# channels:
#   - name: "Default Channel"
#     isActive: false  # Change this value

# Run diff to verify change is detected
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
# Verify: Should show "isActive changed from true to false"
```

### 3. Test Bug #4 Fix: Introspect Creates Invalid Attribute Definitions
```bash
# Introspect to get current state
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Deploy should work without attribute duplication errors
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci

# Deploy again - should still work
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
# Verify: No duplicate attribute errors
```

### 4. Test Bug #1 Fix: Duplicate Attribute Handling
```bash
# Add a shared attribute across multiple product types
# Edit config.yml:
productTypes:
  - name: "Digital Products"
    productAttributes:
      - name: "License Type"
        inputType: DROPDOWN
        values:
          - name: "MIT"
          - name: "Apache"
  - name: "Software"
    productAttributes:
      - name: "License Type"  # Same attribute name
        inputType: DROPDOWN
        values:
          - name: "MIT"
          - name: "Apache"

# Deploy - should succeed without duplicate errors
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci

# Deploy again - should reuse existing attributes
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
# Verify: No duplicate attribute errors, attributes are reused
```

### 5. Test Bug #6 Fix: Page Type Attributes Comparison
```bash
# Introspect current state
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Add attribute to a page type
# Edit config.yml:
pageTypes:
  - name: "Blog Post"
    attributes:
      - name: "SEO Title"
        inputType: PLAIN_TEXT

# Run diff - should detect the change
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
# Verify: Shows 'Attribute "SEO Title" added (in config, not on Saleor)'

# Deploy the change
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
```

### 6. Test Bug #7 Fix: Category Parent-Child Relationships
```bash
# Introspect to get categories
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Modify subcategory structure
# Edit config.yml:
categories:
  - name: "Electronics"
    subcategories:
      - name: "Laptops"
        subcategories:
          - name: "Gaming Laptops"
          - name: "Business Laptops"  # Add this

# Run diff - should show parent context
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs
# Verify: Shows 'In "Laptops": Subcategory "Business Laptops" added'
```

### 7. Test Bug #8 Fix: Category Introspection
```bash
# Categories should be introspected properly
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Verify categories section exists in config.yml
cat config.yml | grep -A 5 "categories:"
# Verify: Categories section should be present with data
```

### 8. Test Enhanced Error Handling
```bash
# Test with invalid token
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token INVALID_TOKEN --ci
# Verify: Clear authentication error message

# Test with invalid URL
pnpm run deploy --url https://invalid-store.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
# Verify: Clear network error message

# Test with malformed config
echo "invalid: yaml: content:" > config.yml
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
# Verify: Clear validation error message
```

### 9. Test Deploy Command (Push Replacement)
```bash
# The new deploy command should work for all scenarios
rm -f config.yml
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Make a small change to shop settings
# Edit config.yml:
shop:
  defaultMailSenderName: "Test Store Updated"

# Deploy the change
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
# Verify: Deployment succeeds with progress indicators
```

### 10. Test Complete Workflow
```bash
# Full end-to-end test
rm -f config.yml

# 1. Introspect
pnpm run introspect --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# 2. Check diff (should be empty)
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# 3. Make multiple changes in config.yml:
# - Change shop name
# - Add/modify a channel
# - Add an attribute to a product type
# - Modify a page type
# - Add a category

# 4. Check diff (should show all changes)
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# 5. Deploy changes
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci

# 6. Check diff again (should be empty)
pnpm run diff --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# 7. Deploy again (should succeed with no changes)
pnpm run deploy --url https://store-rzalldyg.saleor.cloud --token YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs --ci
```

## Expected Results

1. **Selective flags**: Only specified sections appear in config.yml
2. **Channel tracking**: isActive field changes are detected
3. **Attribute handling**: No duplicate attribute errors on re-deployment
4. **Page type attrs**: Changes are properly detected in diff
5. **Category hierarchy**: Parent context shown in diff messages
6. **Error messages**: Clear, actionable error messages for various failure scenarios
7. **Deploy command**: Works reliably with progress indicators
8. **Multiple deploys**: Can deploy multiple times without errors

## Notes

- Always use `--ci` flag for non-interactive deployment
- Check deployment-report-*.json files for detailed deployment logs
- The token expires periodically, so update if you get auth errors