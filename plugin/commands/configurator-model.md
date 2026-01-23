---
name: configurator-model
description: Interactive wizard for designing product types, custom entities (Models), and catalog organization by analyzing your business and guiding modeling decisions
allowed-tools: Read, Write, Edit, AskUserQuestion, Glob, TaskCreate, TaskUpdate, TaskList
argument-hint: [description]
disable-model-invocation: true
---

# Domain Modeling Wizard

Guide the user through designing their complete catalog structure. This wizard helps translate business requirements into Saleor's data model:

- **ProductTypes & Attributes** - Product structure and variants
- **Models (Pages)** - Custom entities (Brands, Ingredients, Profiles)
- **Categories** - Hierarchical product organization
- **Collections** - Curated product groupings
- **Structures (Menus)** - Navigation and curated guides

## Progress Tracking

Create tasks to show wizard progress:

```
Use TaskCreate at the start:
1. "Understand products" - activeForm: "Understanding your products"
2. "Identify attributes" - activeForm: "Identifying product attributes"
3. "Classify attributes" - activeForm: "Classifying product vs variant attributes"
4. "Select attribute types" - activeForm: "Selecting attribute types"
5. "Calculate variant matrix" - activeForm: "Calculating variant matrix"
6. "Generate ProductType" - activeForm: "Generating ProductType configuration"
7. "Review and refine" - activeForm: "Reviewing configuration"

Update status as you progress through each step.
```

## Skills Reference

Load and use the `product-modeling` skill for decision frameworks:
- Product vs variant attribute decisions
- Attribute type selection guide
- Variant matrix calculations
- Industry-specific patterns

## Context Check

Check if config.yml exists:

```bash
test -f config.yml && echo "CONFIG_EXISTS" || echo "NO_CONFIG"
```

If config.yml exists, also check for existing productTypes to understand current structure.

## Wizard Workflow

### Step 1: Understand the Product

If $ARGUMENTS is provided, use it as the starting point. Otherwise, ask:

**Question to ask with AskUserQuestion:**
- "Describe your product in detail. What are you selling?"

Gather information about:
- What is the product? (e.g., "T-shirts", "smartphones", "coffee beans")
- What makes one item different from another? (variations)
- What information do customers need to see?
- What do customers choose at checkout?

### Step 2: List All Characteristics

Based on the product description, identify ALL characteristics/fields the product has.

Present back to the user:
```
Based on your description, I identified these characteristics:
- [characteristic 1]
- [characteristic 2]
- [characteristic 3]
...

Are there any characteristics I missed?
```

Use AskUserQuestion to confirm or gather additional characteristics.

### Step 3: Classify Each Characteristic

For each characteristic, determine if it's a **Product-Level** or **Variant-Level** attribute.

Apply the decision framework from product-modeling skill:

**Product-Level (same for ALL variants):**
- Descriptive information (Brand, Material, Care Instructions)
- Categorization (Style, Gender, Collection)
- Specifications that don't vary (Processor type, Display type)

**Variant-Level (creates purchasable SKUs):**
- Customer selectable options (Size, Color)
- Affects price (Storage capacity, Material quality tier)
- Requires separate inventory tracking (each combination needs stock)

Present classification to user as a table:

```
| Characteristic | Classification | Reasoning |
|----------------|----------------|-----------|
| Brand          | Product        | Same for all variants |
| Size           | Variant        | Customer selects, separate inventory |
| Color          | Variant        | Customer selects, separate inventory |
| Material       | Product        | Usually same for all variants |
...
```

Ask user to confirm or adjust classifications.

### Step 4: Select Attribute Types

For each characteristic, recommend the appropriate Saleor attribute type:

| Characteristic | Recommended Type | Reasoning |
|----------------|------------------|-----------|
| Brand          | DROPDOWN         | Single choice from predefined list |
| Size           | DROPDOWN         | Single choice from sizes |
| Color          | SWATCH           | Visual color selection |
| Features       | MULTISELECT      | Multiple can apply |
| Description    | RICH_TEXT        | Long formatted text |
| Weight         | NUMERIC          | Number with unit |
| Is Organic     | BOOLEAN          | Yes/No toggle |

Use the type selection decision tree from product-modeling skill.

Present recommendations and ask user to confirm.

### Step 5: Define Attribute Values

For DROPDOWN, MULTISELECT, and SWATCH types, gather the specific values:

**Ask with AskUserQuestion:**
- "What are the available sizes?" → XS, S, M, L, XL, XXL
- "What colors do you offer?" → Black, White, Navy (with hex codes for SWATCH)
- "What materials do you use?" → Cotton, Polyester, etc.

For SWATCH colors, help generate hex codes:
- Black: #000000
- White: #FFFFFF
- Navy: #000080
- etc.

### Step 6: Calculate Variant Matrix

Calculate the number of SKUs that will be created:

```
Variant Attributes:
- Size: 6 values (XS, S, M, L, XL, XXL)
- Color: 5 values (Black, White, Navy, Gray, Red)

Total SKUs per product: 6 × 5 = 30 variants
```

**Assessment:**
| SKU Count | Assessment |
|-----------|------------|
| 1-10      | Manageable |
| 11-50     | Moderate - requires inventory management |
| 51-100    | High - consider splitting product lines |
| 100+      | Very High - simplify or split products |

If SKU count is high (>50), suggest:
- Moving some variant attributes to product level
- Splitting into multiple product types
- Limiting value combinations

### Step 7: Generate ProductType Configuration

Generate the YAML configuration:

```yaml
productTypes:
  - name: "[Product Type Name]"
    isShippingRequired: true  # Set based on physical/digital
    weight:
      value: [value]
      unit: G
    productAttributes:
      - name: "[Attribute Name]"
        type: [TYPE]
        values:  # For DROPDOWN/MULTISELECT/SWATCH
          - name: "[Value]"
        visibleInStorefront: true
        filterableInStorefront: true  # If useful for filtering
    variantAttributes:
      - name: "[Attribute Name]"
        type: [TYPE]
        values:
          - name: "[Value]"
        visibleInStorefront: true
        filterableInStorefront: true
```

### Step 8: Review and Refine

Present the complete configuration and ask:
- "Does this ProductType structure look correct?"
- "Would you like to add more product types?"
- "Should I add this to your config.yml?"

If user confirms, either:
1. Create new config.yml with the productType
2. Or add to existing config.yml (append to productTypes section)

### Step 9: Next Steps

After generating the ProductType:

1. Explain how to create products using this type:
   ```yaml
   products:
     - name: "Product Name"
       slug: "product-slug"
       productType: "[ProductType Name]"
       category: "[category-slug]"
       attributes:
         [Product Attribute]: "Value"
       variants:
         - sku: "SKU-001"
           attributes:
             [Variant Attribute]: "Value"
   ```

2. Suggest running `/configurator-validate` to check the configuration

3. Offer to help create:
   - Categories for the products
   - Sample products with variants
   - Additional product types

## Interactive Patterns

Use AskUserQuestion for key decisions:

**Multiple product types:**
```
options:
- "Yes, I have more product types to define"
- "No, this is sufficient for now"
```

**Classification confirmation:**
```
options:
- "This classification looks correct"
- "I need to change some classifications"
```

**SKU count warning:**
```
options:
- "Keep all variant attributes (accept high SKU count)"
- "Move [attribute] to product level"
- "Reduce value options"
```

## Example Session

User: "I sell craft coffee beans"

Assistant identifies:
- Origin (Ethiopia, Colombia, Brazil)
- Roast Level (Light, Medium, Dark)
- Flavor Notes (Fruity, Nutty, Chocolate)
- Certifications (Organic, Fair Trade)
- Bag Size (250g, 500g, 1kg)
- Grind (Whole Bean, Espresso, Filter)

Classification:
- Origin → Product (defines the coffee)
- Roast Level → Product (defines the coffee)
- Flavor Notes → Product (MULTISELECT, descriptive)
- Certifications → Product (MULTISELECT, descriptive)
- Bag Size → Variant (affects price, inventory)
- Grind → Variant (customer choice)

SKU calculation: 3 sizes × 4 grinds = 12 SKUs per coffee ✓

Generated ProductType with proper structure.

## Error Handling

If user provides unclear information:
- Ask clarifying questions
- Provide examples from similar industries
- Reference patterns from product-modeling skill

If user wants to model something complex:
- Break into multiple product types
- Suggest using REFERENCE attributes for related entities
- Guide toward maintainable structure

---

## Extended Workflow: Beyond Products

After completing product modeling, or if user needs other entity types, offer extended guidance.

### Modeling Custom Entities (Models/Pages)

When user needs entities beyond products (Brands, Ingredients, Profiles):

**Question to ask:**
"Do you have concepts that are shared across products but need their own rich data? Examples: Brands with logos, Scent Profiles, Ingredients with benefits"

If YES, guide through Model creation:

1. **Identify the entity** - What is it? (Brand, Ingredient, Profile)
2. **Define attributes** - What fields does it need?
3. **Generate PageType** - Create the schema
4. **Create Model instances** - Add specific entries
5. **Link to Products** - Use REFERENCE attribute

**Model Decision Framework:**
| Use Case | Use Model | Use Product Attribute |
|----------|:---------:|:---------------------:|
| Shared across many products | ✓ | |
| Has its own detailed attributes | ✓ | |
| Needs its own page/content | ✓ | |
| Simple value selection | | ✓ |
| No data beyond name | | ✓ |

**Example Model Configuration:**
```yaml
pageTypes:
  - name: "Brand"
    attributes:
      - name: "Logo"
        type: FILE
      - name: "Description"
        type: RICH_TEXT
      - name: "Country"
        type: DROPDOWN
        values: ["USA", "Germany", "Japan"]

models:
  - title: "Nike"
    slug: "nike"
    pageType: "Brand"
    attributes:
      Country: "USA"
```

### Organizing Products: Categories vs Collections

**Question to ask:**
"How do you want customers to browse your products? Through a taxonomy (Categories) or curated groups (Collections)?"

**Categories** (hierarchical, 1 product = 1 category):
- Main site navigation
- SEO-driven URL structure
- Product taxonomy (what IS this product?)

**Collections** (flat, 1 product = N collections):
- Promotions ("Summer Sale")
- Curated groups ("Staff Picks")
- Marketing campaigns

**Category Hierarchy Example:**
```yaml
categories:
  - name: "Electronics"
    slug: "electronics"
    children:
      - name: "Phones"
        slug: "phones"
        children:
          - name: "Smartphones"
            slug: "smartphones"
```

**Collection Example:**
```yaml
collections:
  - name: "New Arrivals"
    slug: "new-arrivals"
    channelListings:
      - channel: "default"
        isPublished: true
```

### Building Navigation: Structures (Menus)

**Question to ask:**
"Do you need navigation menus or curated guides that link categories, collections, and content pages?"

**Structure can link:**
- Categories (taxonomy)
- Collections (promotions)
- Models/Pages (content)
- External URLs

**Navigation Example:**
```yaml
menus:
  - name: "Main Navigation"
    slug: "main-nav"
    items:
      - name: "Shop"
        category: "shop"
        children:
          - name: "New Arrivals"
            collection: "new-arrivals"
          - name: "Electronics"
            category: "electronics"
      - name: "Brands"
        children:
          - name: "Nike"
            page: "nike"
      - name: "About"
        page: "about-us"
```

**Curated Guide Example:**
```yaml
menus:
  - name: "Home Office Guide"
    slug: "home-office-guide"
    items:
      - name: "Ergonomics Tips"
        page: "ergonomics"        # Content Model
      - name: "Recommended Desks"
        category: "desks"         # Products
      - name: "Office Bundles"
        collection: "office-bundles"  # Promotion
```

---

## Complete Modeling Checklist

Use AskUserQuestion to check what the user needs:

**"What do you need to model?"**
Options:
- Products with variants (ProductTypes, Attributes)
- Custom entities like Brands or Profiles (Models)
- Product organization (Categories, Collections)
- Navigation or curated guides (Structures)
- Complete store setup (all of the above)

Based on selection, guide through relevant sections.

## Skills Reference (Extended)

The `product-modeling` skill covers:
- Attributes → ProductTypes → Products → Variants flow
- Product vs variant attribute decisions
- Attribute type selection (12 types)
- Variant matrix calculations
- Models (Pages) - when and how to use
- Categories vs Collections decision framework
- Structures (Menus) - navigation and curated guides
- Industry-specific patterns

Reference files:
- `reference/attribute-types-deep-dive.md` - All attribute types
- `reference/industry-patterns.md` - 10+ industry patterns
- `reference/models-and-structures.md` - Complete Models & Structures guide

Examples:
- `examples/fashion-product-types.yml`
- `examples/electronics-product-types.yml`
- `examples/perfume-store-models.yml` - Models with REFERENCE attributes
- `examples/navigation-structures.yml` - Menu configurations
