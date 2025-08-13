# Fashion & Apparel Recipe

A comprehensive configuration for fashion e-commerce stores, including clothing, footwear, and accessories with complete size charts, color swatches, and seasonal collections.

## 🎯 Use Cases

- **Clothing retailers** (online fashion stores)
- **Multi-brand fashion platforms**
- **Footwear specialists**
- **Accessories boutiques**
- **Department stores** (fashion sections)
- **Fast fashion chains**
- **Luxury fashion brands**

## 🚀 Quick Start

```bash
# Initialize a new fashion store
npx @saleor/configurator init --recipe fashion

# Or apply to existing configuration
npx @saleor/configurator apply --recipe fashion

# Deploy to your Saleor instance
npx @saleor/configurator deploy --url https://your-store.saleor.cloud/graphql/ --token your-token
```

## 📋 What's Included

### Product Types

#### Apparel
Complete clothing configuration with:
- Brand management (Nike, Adidas, Zara, etc.)
- Material tracking (Cotton, Polyester, Wool, etc.)
- Seasonal collections
- Gender categories
- Care instructions
- Style classifications (Casual, Formal, Sport)
- Fit types (Regular, Slim, Relaxed)
- Pattern options
- Sustainability badges

#### Footwear
Specialized shoe attributes:
- Shoe types (Sneakers, Boots, Sandals)
- Closure mechanisms
- Heel heights
- Water resistance
- Size conversions (US/EU)

#### Accessories
Flexible accessory management:
- Multiple accessory types
- One-size and adjustable options
- Material and style attributes

### Variant Attributes

#### Size System
Comprehensive size chart with international conversions:
- US sizes (0-22)
- EU sizes (32-54)
- UK sizes (4-26)
- Metadata for size guides

#### Color Swatches
Visual color selection with hex codes:
- 10 base colors with hex values
- SWATCH input type for visual display
- Consistent across product types

### Page Types

#### Size Guide
- Product category specific guides
- Measurement instructions
- Fit notes and recommendations

#### Lookbook
- Seasonal collections
- Featured product galleries
- Styling tips
- Visual merchandising

### Categories

Hierarchical structure:
```
Women/
├── Clothing/
│   ├── Dresses
│   ├── Tops
│   ├── Bottoms
│   └── Outerwear
├── Shoes
└── Accessories

Men/
├── Clothing/
│   ├── Shirts
│   ├── Pants
│   └── Suits
└── [...]

Kids/
├── Girls
├── Boys
└── Baby

Sale/
New Arrivals/
```

## 🔧 Customization Guide

### Adding Brands

Extend the brand list in product attributes:

```yaml
- name: "Brand"
  slug: brand
  inputType: DROPDOWN
  values:
    - name: "Your Brand"
      slug: your-brand
    - name: "Partner Brand"
      slug: partner-brand
```

### Size Localization

Add region-specific size conversions:

```yaml
- name: "M"
  slug: m
  metadata:
    us: "8-10"
    eu: "40-42"
    uk: "12-14"
    jp: "11-13"  # Add Japanese sizes
    au: "12-14"  # Add Australian sizes
```

### Seasonal Updates

Update collections for new seasons:

```yaml
- name: "Collection"
  slug: collection
  values:
    - name: "Spring 2025"
      slug: spring-2025
    - name: "Pre-Fall 2025"
      slug: pre-fall-2025
```

### Custom Fit Types

Add brand-specific fit classifications:

```yaml
- name: "Fit Type"
  values:
    - name: "Tailored"
      slug: tailored
    - name: "Comfort Fit"
      slug: comfort-fit
```

## 🏗️ Implementation Tips

### Size Charts
1. Create size guide pages for each product category
2. Link size guides from product pages
3. Include measurement instructions with images

### Color Management
1. Use consistent color naming across products
2. Include multiple images per color variant
3. Consider color-specific inventory tracking

### Seasonal Transitions
1. Use collections to manage seasonal products
2. Automate sale category population
3. Plan transition periods between seasons

### Multi-Channel Strategy
1. Use "Online Store" for full-price items
2. Use "Outlet" channel for clearance
3. Consider separate channels for different regions

## 📊 Recommended Extensions

### Analytics
- Size popularity tracking
- Color preference analysis
- Return rate by fit type
- Seasonal performance metrics

### Features to Add
- Virtual try-on integration
- Size recommendation engine
- Wishlist functionality
- Style quiz for personalization

### Marketing Tools
- Lookbook galleries
- Influencer collections
- Email campaigns by style preference
- Abandoned cart recovery

## 💡 Best Practices

### Product Data
1. **Consistent Naming**: Use standardized color and size names
2. **Rich Media**: Include multiple angles, detail shots, model photos
3. **Detailed Descriptions**: Include fit, material, care instructions
4. **SEO Optimization**: Use descriptive product titles and meta tags

### Inventory Management
1. **Size Curves**: Stock popular sizes more heavily
2. **Color Variants**: Track best-selling colors
3. **Seasonal Planning**: Pre-order for peak seasons
4. **Return Processing**: Quick restock of returned items

### Customer Experience
1. **Size Guides**: Prominent placement on product pages
2. **Filter Options**: Enable filtering by all attributes
3. **Quick View**: Allow browsing without page loads
4. **Mobile Optimization**: Ensure swatches work on mobile

## 🔗 Related Documentation

- [Saleor Fashion Industry Guide](https://docs.saleor.io/guides/fashion)
- [Product Variants](https://docs.saleor.io/developer/products/variants)
- [Attribute Configuration](https://docs.saleor.io/developer/attributes)

## 🤝 Support

For questions about this recipe:
- [GitHub Issues](https://github.com/saleor/configurator/issues)
- [Discord Community](https://discord.gg/saleor)
- [Saleor Documentation](https://docs.saleor.io)