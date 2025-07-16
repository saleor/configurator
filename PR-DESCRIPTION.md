# Deploy Command Enhancements and Reporting

## Overview

This PR introduces significant improvements to the deploy command (formerly push), focusing on better change visibility, comprehensive reporting, and clearer user feedback during deployments.

## Key Changes

### 1. Enhanced Change Tracking

The deploy command now shows detailed before/after values for all configuration changes. When updating entities, users can see exactly what will change:

```
Update: "US Channel"
  └─ currencyCode: "USD" → "EUR"
  └─ defaultCountry: "US" → "DE"
```

### 2. Array Change Formatting

Implemented two display modes for array changes (controlled by a temporary feature flag):

- **Compact format (default)**: Shows array changes in a single line
  ```
  attributes.Material.values: [-Cotton, -Elastane, +CottonChanged, +ElastaneChanged]
  ```

- **Legacy format**: Shows each change on a separate line (set `SALEOR_COMPACT_ARRAYS=false`)

### 3. Automatic Deployment Reports

Every deployment now generates a comprehensive JSON report containing:
- Timestamp and duration information
- Detailed timing for each deployment stage
- Complete list of all changes with old/new values
- Summary statistics by entity type
- Success/failure status

Reports are automatically saved with timestamp-based filenames (e.g., `deployment-report-2024-01-15_10-30-00.json`). Users can specify a custom path using the `--report-path` option.

### 4. Improved Error Handling

Added context-aware error messages that provide specific guidance based on the type of failure:
- Product type deletion failures (when products are associated)
- Attribute value removal failures (when values are in use)
- Network and authentication errors

### 5. Better User Warnings

The system now clearly communicates deployment limitations:
- Warns when destructive operations are detected
- Shows which attribute values will be removed
- Explains when certain operations may not complete (e.g., attribute values in use)
- Provides guidance on resolving sync issues

### 6. CI Mode Improvements

- Removed the `--force` flag in favor of a clearer `--ci` flag
- CI mode skips all confirmations for automated deployments
- Works seamlessly with quiet mode for cleaner CI logs

## Technical Implementation

### Command Schema Changes
- Removed `--force` flag
- Added `--report-path` option for custom report locations
- Maintained backward compatibility with existing flags

### Deployment Pipeline
- Enhanced error propagation to show actual failure reasons
- Improved stage-level error messages
- Added deployment metrics collection

### Diff Formatting
- Created new `DeployDiffFormatter` for deployment-specific formatting
- Implemented array change grouping logic
- Added value type-specific colorization (booleans, numbers, strings)

## Known Limitations

Currently, the system only adds new attribute values but does not remove old ones. This limitation is documented and users are provided with clear workarounds:
1. Include both old and new values in configuration
2. Manually remove values through Saleor admin
3. Accept repeated diffs as a known issue

The deployment process warns users about this limitation when it detects value removals.

## Usage Examples

Basic deployment with confirmation:
```bash
configurator deploy -u https://my-shop.saleor.cloud/graphql/ -t <token>
```

CI mode with custom report path:
```bash
configurator deploy --ci --report-path ci-deployment.json
```

Legacy array format:
```bash
SALEOR_COMPACT_ARRAYS=false configurator deploy
```

## Breaking Changes

None. The removal of `--force` flag is handled gracefully with `--ci` as the replacement.

## Testing

All existing tests pass. The feature flag for array formatting allows easy A/B testing of both display modes. Manual testing confirmed:
- Correct change detection and display
- Proper report generation
- Accurate error messages
- Appropriate warnings for partial deployments