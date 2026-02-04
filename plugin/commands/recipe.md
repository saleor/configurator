---
name: recipe
description: Apply pre-built Saleor store recipes with smart defaults - fashion, electronics, food, subscriptions, and more
allowed-tools: Bash, Read, Write, Edit, AskUserQuestion, Glob, Task
argument-hint: [type] [--url=...] [--token=...] [--customize]
---

# Recipe

Quick-start your Saleor store with pre-built, production-ready configurations. Recipes include complete channel, product type, category, and attribute setups tailored to specific business types.

## Usage

```bash
# Interactive mode (recommended for first-time users)
/recipe

# Quick apply (for experienced users)
/recipe fashion
/recipe electronics
/recipe food
/recipe subscription

# With immediate deployment
/recipe fashion --url=$SALEOR_API_URL --token=$SALEOR_TOKEN

# Customize before applying
/recipe fashion --customize
```

## Available Recipes

| Recipe | Best For | Includes |
|--------|----------|----------|
| **fashion** | Apparel, shoes, accessories | Size/Color variants, seasonal collections, style attributes |
| **electronics** | Tech, gadgets, computers | Storage/RAM variants, specs, warranties |
| **food** | Grocery, restaurants, delivery | Weight/Volume, expiry, dietary attributes |
| **subscription** | SaaS, digital, recurring | Billing cycles, tiers, digital delivery |
| **general** | Mixed retail, marketplace | Flexible structure, common attributes |

## Workflow

### Step 1: Recipe Selection

If no recipe specified as argument, ask via AskUserQuestion:

**Question**: "What type of store are you setting up?"
**Options**:
- Fashion/Apparel (clothing, shoes, accessories)
- Electronics (phones, computers, gadgets)
- Food & Grocery (perishables, groceries, delivery)
- Subscription Service (SaaS, digital products, memberships)
- General Retail (mixed products, marketplace)

### Step 2: Context Check

Check current state:

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

**If config.yml exists**:
- Ask user: Merge with existing or replace?
- If merge: Load existing config, add recipe entities
- If replace: Backup to config.yml.backup, then replace

### Step 3: Customization (Optional)

If `--customize` flag or user requests it:

**Basic Settings**:
- Channel name (default: "Main Store")
- Currency (default: USD)
- Country (default: US)

**Product Types**:
- Keep all suggested types?
- Add custom types?
- Modify attributes?

**Categories**:
- Use suggested hierarchy?
- Add custom categories?
- Adjust structure?

**Advanced**:
- Add warehouses?
- Configure shipping zones?
- Set up tax classes?

### Step 4: Apply Recipe

1. **Load recipe template**:
```bash
cat ${CLAUDE_PLUGIN_ROOT}/skills/configurator-recipes/templates/[recipe-type].yml
```

2. **Apply customizations** (if any)

3. **Generate config.yml**:
```yaml
# Saleor Store Configuration
# Generated from [recipe-type] recipe
# Date: [current date]

channels:
  - name: "[User's channel or 'Main Store']"
    slug: "main"
    currencyCode: [USD or user's choice]
    defaultCountry: [US or user's choice]
    isActive: true

# Recipe-specific content below
productTypes: [...]
categories: [...]
attributes: [...]
```

4. **Write to config.yml**

### Step 5: Validation & Review

After generating config:

1. **Validate YAML syntax**:
```bash
python3 -c "import yaml; yaml.safe_load(open('config.yml'))"
```

2. **Proactively launch config-review agent**:
   - Check for any issues
   - Validate recipe completeness
   - Suggest improvements

3. **Show summary**:
```
✓ Applied [recipe-type] recipe to config.yml

Configuration includes:
- [N] channels
- [N] product types with [N] attributes
- [N] categories in [N]-level hierarchy
- [N] collections

Next steps:
1. Add your products manually or via import
2. Preview changes: /configurator validate
3. Deploy: npx configurator deploy --url=... --token=...
```

### Step 6: Deployment (Optional)

If `--url` and `--token` provided:

1. **Dry-run first**:
```bash
npx configurator deploy --url=[url] --token=[token] --dry-run
```

2. **Show what will change**:
   - Count: creates, updates, deletes
   - Warn about deletions
   - Preview entity changes

3. **Confirm deployment**:
   Ask user: "Ready to deploy? This will create [N] entities on your Saleor instance."

4. **Deploy**:
```bash
npx configurator deploy --url=[url] --token=[token]
```

5. **Verify**:
   - Report success/failure
   - If failed: Launch troubleshoot agent
   - If success: Show Dashboard links

## Recipe Details

### Fashion Recipe

**Product Types**:
- T-Shirt (Size: XS-XXL, Color: SWATCH)
- Pants (Waist, Length, Color)
- Dress (Size, Color, Style)
- Shoes (Size, Color, Material)
- Accessory (Type, Color, Material)

**Categories**:
```
Clothing
├── Men
│   ├── Shirts
│   ├── Pants
│   └── Outerwear
├── Women
│   ├── Dresses
│   ├── Tops
│   └── Bottoms
└── Accessories
    ├── Bags
    ├── Jewelry
    └── Belts
```

**Collections**:
- New Arrivals
- Sale Items
- Seasonal (Spring, Summer, Fall, Winter)
- Best Sellers

### Electronics Recipe

**Product Types**:
- Smartphone (Brand, Storage, RAM, Color)
- Laptop (Brand, Storage, RAM, Screen Size)
- Tablet (Storage, Screen Size, Color)
- Accessory (Type, Compatibility, Color)

**Categories**:
```
Electronics
├── Mobile Devices
│   ├── Smartphones
│   ├── Tablets
│   └── Wearables
├── Computers
│   ├── Laptops
│   ├── Desktops
│   └── Monitors
└── Accessories
    ├── Cases
    ├── Chargers
    └── Cables
```

**Attributes**:
- Warranty (1 year, 2 years, 3 years)
- Condition (New, Refurbished, Used)
- Connectivity (WiFi, Bluetooth, 5G)

### Food Recipe

**Product Types**:
- Fresh Produce (Weight, Organic, Origin)
- Packaged Food (Weight, Expiry, Dietary)
- Beverage (Volume, Type, Dietary)
- Prepared Food (Serves, Dietary, Allergens)

**Categories**:
```
Food & Grocery
├── Fresh
│   ├── Fruits
│   ├── Vegetables
│   └── Dairy
├── Packaged
│   ├── Snacks
│   ├── Canned Goods
│   └── Frozen
└── Beverages
    ├── Soft Drinks
    ├── Coffee & Tea
    └── Juices
```

**Attributes**:
- Dietary (Vegan, Vegetarian, Gluten-Free, Organic)
- Allergens (Nuts, Dairy, Gluten, Soy)
- Storage (Refrigerated, Frozen, Room Temperature)

### Subscription Recipe

**Product Types**:
- Subscription Plan (Billing Cycle, Tier, Features)
- Digital Product (Format, License Type)
- Service (Duration, Level)

**Categories**:
```
Subscriptions
├── Monthly Plans
├── Annual Plans
├── Enterprise
└── Add-ons
```

**Attributes**:
- Billing Cycle (Monthly, Quarterly, Annual)
- Tier (Basic, Pro, Enterprise)
- Features (Users, Storage, Support Level)
- Auto-renewal (Yes, No)

### General Recipe

Minimal, flexible structure for mixed retail:

**Product Types**:
- Physical Product (with shipping)
- Digital Product (no shipping)

**Categories**:
```
Products
├── Featured
├── New
└── On Sale
```

## Error Handling

- If recipe file missing: List available recipes
- If YAML generation fails: Show error, offer retry
- If validation fails: Show issues, suggest fixes
- If deployment fails: Launch troubleshoot agent

## Merging with Existing Config

When merging recipes:

1. **Preserve existing**:
   - Channels (don't duplicate)
   - Existing products
   - Custom attributes

2. **Add from recipe**:
   - New product types (if name doesn't exist)
   - New categories (merge hierarchies)
   - New attributes (if name doesn't exist)

3. **Handle conflicts**:
   - Same product type name: Ask to merge or skip
   - Same category slug: Ask to merge or rename
   - Same attribute name: Use existing definition

## Skills Referenced

- `configurator-recipes` for recipe templates
- `configurator-schema` for config structure
- `saleor-domain` for entity relationships
- `configurator-cli` for deployment commands

## Related Commands

- `/configurator` - Core operations (init, validate, edit, review)
- `/discover` - Generate config from existing website
- `/configurator-model` - Product modeling wizard
