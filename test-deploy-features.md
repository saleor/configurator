# Testing the New Deploy Features

## 1. Testing Enhanced Change Display (Old -> New Values)

Create a configuration file with some existing entities to update:

```yaml
# config.yml
shop:
  name: "My Shop"
  defaultMailSenderName: "Old Sender Name"
  defaultMailSenderAddress: "old@example.com"

channels:
  - name: "US Channel"
    currencyCode: "USD"
    defaultCountry: "US"
    slug: "us-channel"

productTypes:
  - name: "Digital Product"
    slug: "digital-product"
    isShippingRequired: false
    hasVariants: true
```

Deploy this configuration first, then modify it:

```yaml
# Updated config.yml
shop:
  name: "My Updated Shop"  # Changed
  defaultMailSenderName: "New Sender Name"  # Changed
  defaultMailSenderAddress: "new@example.com"  # Changed

channels:
  - name: "US Channel"
    currencyCode: "EUR"  # Changed from USD to EUR
    defaultCountry: "DE"  # Changed from US to DE
    slug: "us-channel"

productTypes:
  - name: "Digital Product"
    slug: "digital-product"
    isShippingRequired: true  # Changed from false to true
    hasVariants: true
```

Run deploy command:
```bash
configurator deploy -u <url> -t <token>
```

Expected output will show:
```
📋 Configuration Changes
─────────────────────────────────────────

🏪 Shop Settings
──
  📝 Update: "Shop Settings"
    └─ name: "My Shop" → "My Updated Shop"
    └─ defaultMailSenderName: "Old Sender Name" → "New Sender Name"
    └─ defaultMailSenderAddress: "old@example.com" → "new@example.com"

💰 Channels
──
  📝 Update: "US Channel"
    └─ currencyCode: "USD" → "EUR"
    └─ defaultCountry: "US" → "DE"

📦 Product Types
──
  📝 Update: "Digital Product"
    └─ isShippingRequired: false → true
```

## 2. Testing JSON Report Generation

### Default Report Generation

Every deployment automatically generates a report:

```bash
configurator deploy -u <url> -t <token>
# Saves to: deployment-report-2024-01-15_10-30-00.json
```

### Custom Report Path

You can specify a custom path:

```bash
configurator deploy -u <url> -t <token> --report-path custom-deployment.json
# Saves to: custom-deployment.json
```

The generated report will contain:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": {
    "totalMs": 5432,
    "formatted": "5.4s"
  },
  "startTime": "2024-01-15T10:29:54.568Z",
  "endTime": "2024-01-15T10:30:00.000Z",
  "stages": [
    {
      "name": "Validating configuration",
      "durationMs": 150,
      "durationFormatted": "150ms"
    },
    {
      "name": "Updating shop settings",
      "durationMs": 1200,
      "durationFormatted": "1.2s"
    },
    {
      "name": "Managing channels",
      "durationMs": 2100,
      "durationFormatted": "2.1s"
    },
    {
      "name": "Managing product types",
      "durationMs": 1982,
      "durationFormatted": "2.0s"
    }
  ],
  "summary": {
    "totalChanges": 3,
    "created": 0,
    "updated": 3,
    "deleted": 0
  },
  "changes": [
    {
      "entityType": "Shop Settings",
      "entityName": "Shop Settings",
      "operation": "UPDATE",
      "fields": [
        {
          "field": "name",
          "oldValue": "My Shop",
          "newValue": "My Updated Shop"
        },
        {
          "field": "defaultMailSenderName",
          "oldValue": "Old Sender Name",
          "newValue": "New Sender Name"
        },
        {
          "field": "defaultMailSenderAddress",
          "oldValue": "old@example.com",
          "newValue": "new@example.com"
        }
      ]
    },
    {
      "entityType": "Channels",
      "entityName": "US Channel",
      "operation": "UPDATE",
      "fields": [
        {
          "field": "currencyCode",
          "oldValue": "USD",
          "newValue": "EUR"
        },
        {
          "field": "defaultCountry",
          "oldValue": "US",
          "newValue": "DE"
        }
      ]
    },
    {
      "entityType": "Product Types",
      "entityName": "Digital Product",
      "operation": "UPDATE",
      "fields": [
        {
          "field": "isShippingRequired",
          "oldValue": false,
          "newValue": true
        }
      ]
    }
  ],
  "entityCounts": {
    "Shop Settings": {
      "created": 0,
      "updated": 1,
      "deleted": 0
    },
    "Channels": {
      "created": 0,
      "updated": 1,
      "deleted": 0
    },
    "Product Types": {
      "created": 0,
      "updated": 1,
      "deleted": 0
    }
  }
}
```

## 3. Testing CI Mode (No Force Flag)

For CI/CD environments, use the `--ci` flag:

```bash
# This will skip all confirmations and save report with timestamp
configurator deploy --ci

# You can also make it quiet for cleaner CI logs with custom report path
configurator deploy --ci --quiet --report-path ci-deployment.json
```

## 4. Testing Destructive Operations

Create a config that removes entities:

```yaml
# Remove a channel from the previous config
channels: []  # Empty array will attempt to delete all channels
```

Run deploy:
```bash
configurator deploy
```

Expected warning:
```
⚠️  DESTRUCTIVE OPERATIONS DETECTED!
The following items will be PERMANENTLY DELETED:
• Channels: "US Channel"

Are you sure you want to continue? This action cannot be undone.
```

## 5. Summary Report Display

After successful deployment, you'll see:

```
╭─────────────────────────────────────────────────────────╮
│ 📊 Deployment Summary                                    │
├─────────────────────────────────────────────────────────┤
│ Duration: 5.4s                                           │
│ Started: 10:29:54 AM                                     │
│ Completed: 10:30:00 AM                                   │
│                                                          │
│ Stage Timing:                                            │
│ • Validating configuration: 150ms                        │
│ • Updating shop settings: 1.2s                           │
│ • Managing channels: 2.1s                                │
│ • Managing product types: 2.0s                           │
│                                                          │
│ Changes Applied:                                         │
│ • Updated: 3 entities                                    │
╰─────────────────────────────────────────────────────────╯

📄 Deployment report saved to: deployment-report-2024-01-15_10-30-00.json
```

## Key Features Summary

1. **No --force flag**: Only `--ci` mode skips confirmations
2. **Enhanced change display**: Shows `oldValue → newValue` for all field changes
3. **Automatic JSON reports**: Always saves deployment report with:
   - Default filename: `deployment-report-YYYY-MM-DD_HH-MM-SS.json`
   - Custom path via `--report-path` option
   - All changes with old/new values
   - Timing metrics for each stage
   - Entity counts by operation type
   - Total duration and timestamps
4. **Better formatting**: Color-coded values (booleans, strings, numbers)
5. **Destructive operation warnings**: Clear warnings for deletions