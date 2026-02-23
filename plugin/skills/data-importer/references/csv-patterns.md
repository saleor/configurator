# CSV/Excel Parsing Patterns

## Excel Conversion

Excel files (.xlsx) need conversion to CSV before import.

**User converts:**
```
Excel: File → Save As → CSV (Comma delimited)
Numbers: File → Export To → CSV
Google Sheets: File → Download → CSV
```

**Python conversion:**
```bash
python3 -c "import pandas as pd; pd.read_excel('$FILE').to_csv('${FILE%.xlsx}.csv', index=False)"
```

**Manual extraction** (xlsx is a ZIP with XML):
```bash
unzip -q "$FILE" -d /tmp/xlsx
cat /tmp/xlsx/xl/sharedStrings.xml | sed 's/<t>/\n/g' | grep -v '^<'
```

## CSV Reading

```bash
# Headers
head -1 "$FILE"

# Row count
wc -l < "$FILE"

# Sample with formatting
head -5 "$FILE" | column -t -s,
```

## Common Issues

### Quoted fields with commas
```csv
"Product, Name",SKU,Price
```
Standard CSV parsers handle this automatically.

### Encoding
```bash
file "$FILE"  # Check encoding
iconv -f ISO-8859-1 -t UTF-8 "$FILE" > "$FILE.utf8"  # Convert if needed
```

### Empty values
Treat `""`, `"N/A"`, `"null"`, `"-"` as empty.

## Data Structures

### Flat list (one row = one product)
```csv
name,sku,price,category
Widget,W-001,29.99,Tools
```

### Variant rows (multiple rows per product)
```csv
product,sku,price,size
T-Shirt,TS-S,29.99,Small
T-Shirt,TS-M,29.99,Medium
```
Group by product column.

### Variant columns
```csv
name,sku_small,price_small,sku_medium,price_medium
T-Shirt,TS-S,29.99,TS-M,29.99
```
Pivot columns into variants.
