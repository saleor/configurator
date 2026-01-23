---
name: configurator-import
description: Import product data from CSV, Excel, or Shopify into config.yml with interactive field mapping
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Glob, Grep
argument-hint: <file-path> [--source shopify]
---

# Configurator Import

Import external product data into Saleor's config.yml format.

## Process

### 1. Check File

```bash
test -f "$1" && file "$1"
```

If no file provided, ask user for the path.

### 2. Handle Excel

If `.xlsx` file, ask user to convert to CSV:
- Excel: File → Save As → CSV
- Google Sheets: File → Download → CSV
- Or try: `python3 -c "import pandas as pd; pd.read_excel('FILE').to_csv('FILE.csv', index=False)"`

### 3. Detect Format

Check first line for format hints:
```bash
head -1 "$FILE"
```

Ask user to confirm:
- **Shopify** (has Handle, Title, Variant columns) → Use `shopify-importer` agent
- **Generic CSV/Excel** → Use `csv-importer` agent

### 4. Delegate to Agent

The agent will:
1. Analyze columns and sample data
2. Guide interactive field mapping
3. Generate config.yml content
4. Return YAML for saving

### 5. Save Decision

Ask user:
- **Merge** with existing config.yml
- **Replace** config.yml (backup first)
- **Preview** only (save to import-preview.yml)

### 6. Next Steps

After import:
```
✓ Imported [N] products

Next:
1. /configurator-review - Review configuration
2. /configurator-validate - Validate schema
3. npx configurator diff --url=$URL --token=$TOKEN
```

## Skills

Reference `data-importer` skill for transformation patterns.
