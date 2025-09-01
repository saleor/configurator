# 🚀 Saleor Configurator v0.11.0 - Enhanced Error Handling

## 📢 Slack Announcement

```
🎉 New Release: Saleor Configurator v0.11.0

We've completely revamped error handling to make debugging a breeze! 

**What's New:**
• 🎯 Actionable error messages with specific fix instructions
• 📝 Relevant CLI commands included in error output
• 🔍 Clear success/failure breakdown for batch operations
• 🛠️ 30+ common error patterns now have recovery suggestions

**Before:**
❌ Error: Channel not found

**After:**
❌ Channel "my-channel" not found
→ Fix: Ensure channel exists in your configuration
→ Check: Run 'saleor-configurator introspect --include=channels'
→ Run: saleor-configurator diff --include=channels

Try it out: pnpm dlx @saleor/configurator@latest
```

## 📋 Full Changelog

### ✨ New Features

#### **Enhanced Error Recovery System**
- Added `ErrorRecoveryGuide` with 30+ error patterns
- Each error now includes:
  - Clear explanation of what went wrong
  - Step-by-step fix instructions
  - Relevant CLI commands to investigate
  - Context about which operation failed

#### **Consistent Service Error Handling**
- Extended `ServiceErrorWrapper` to 80% of services
- Standardized error format across all operations
- Batch operations now show clear success/failure breakdown

#### **Improved Error Messages for Common Issues**
- **Authentication errors**: Token validation steps and permission checks
- **Network errors**: URL format guidance and connectivity checks
- **Validation errors**: Field-specific issues with examples
- **Reference errors**: Entity lookup guidance with proper commands
- **Configuration errors**: Schema validation with fix suggestions

### 🔧 Fixes
- Fixed page type reference attributes to properly require `entityType` field
- Channel service now uses slug-based identification (not name)
- Validation errors pass through correctly without double-wrapping

### 📊 Impact
- **Error Pattern Coverage**: 30+ common scenarios
- **Service Coverage**: 80% now use standardized error handling
- **Test Coverage**: All 577 tests passing

## 🧪 How to Test

### 1. **Test Authentication Error Handling**
```bash
# Use an invalid token
pnpm dlx @saleor/configurator deploy \
  --url https://your-store.saleor.cloud \
  --token INVALID_TOKEN

# Expected: Clear auth error with token validation steps
```

### 2. **Test Network Error Handling**
```bash
# Use an invalid URL
pnpm dlx @saleor/configurator deploy \
  --url https://invalid-url.saleor.cloud \
  --token YOUR_TOKEN

# Expected: Network error with URL format guidance
```

### 3. **Test Validation Errors**
Create a `test-error.yml`:
```yaml
channels:
  - name: "Test Channel"
    slug: "test"
    currencyCode: "INVALID"  # Invalid currency
    defaultCountry: "ZZ"     # Invalid country

taxes:
  taxClasses:
    - name: "Test Tax"
      countryRates:
        - countryCode: "US"
          rate: 150  # Invalid rate > 100
```

Run:
```bash
pnpm dlx @saleor/configurator deploy --config test-error.yml
```

### 4. **Test Reference Attribute Errors**
```yaml
pageTypes:
  - name: "Test Page"
    slug: "test"
    attributes:
      - name: "Product Ref"
        inputType: "REFERENCE"
        # Missing entityType - will show helpful error
```

### 5. **Test Entity Not Found Errors**
```yaml
shippingZones:
  - name: "Test Zone"
    countries: ["US"]
    warehouses: ["non-existent-warehouse"]  # Will show recovery steps
    channels: ["non-existent-channel"]
```

## 📈 Before vs After Examples

### Authentication Error
**Before:**
```
Error: Invalid token
```

**After:**
```
❌ Deployment failed: Authentication Error

Authentication failed

Suggested actions:
  1. Verify your API token is correct: --token YOUR_TOKEN
  2. Check token permissions in Saleor dashboard
  3. Generate a new token if the current one is expired
  4. Ensure the token has the required permissions
```

### Entity Not Found
**Before:**
```
Error: Warehouse not found
```

**After:**
```
❌ Warehouse "main-warehouse" not found

→ Fix: Ensure warehouse 'main-warehouse' exists in your configuration
→ Check: Warehouse slugs must match exactly (case-sensitive)
→ Run: saleor-configurator diff --include=warehouses
```

### Validation Error
**Before:**
```
Error: Invalid configuration
```

**After:**
```
❌ Tax rate must be between 0 and 100

→ Fix: Set tax rate as a percentage between 0 and 100
→ Check: Example: rate: 8.5 for 8.5% tax
→ Run: Validate your tax rates in the configuration
```

## 🔗 Links
- PR: [#105](https://github.com/saleor/configurator/pull/105)
- Documentation: [Saleor Configurator Docs](https://docs.saleor.io/docs/3.x/cli)

## 💡 Tips
- Use `--verbose` flag for detailed error traces
- Run `saleor-configurator diff` before deploy to preview changes
- Check `deployment-report-*.json` for detailed operation logs

---

*Questions? Reach out in #saleor-configurator on Slack*