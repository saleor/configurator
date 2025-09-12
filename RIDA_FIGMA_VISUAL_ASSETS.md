# Rida Technologies - Visual Assets Recommendations

## Brand Identity Guidelines

### Logo Specifications
**Primary Logo**
- Format: SVG (scalable)
- Variants: Full logo, Icon only, Wordmark
- Clear space: 2x height of 'R' around logo
- Minimum size: 120px width

**Logo Placement**
- Title slide: Top right with Saleor
- Content slides: Bottom right corner
- Size: 80-120px depending on slide

### Color Palette

**Primary Colors**
```css
--primary-blue: #2563EB;    /* Trust, Technology */
--primary-blue-dark: #1D4ED8;
--primary-blue-light: #60A5FA;

--secondary-green: #10B981;  /* Growth, Success */
--secondary-green-dark: #059669;
--secondary-green-light: #34D399;
```

**Supporting Colors**
```css
--accent-gold: #F59E0B;      /* Premium, Opportunity */
--accent-gold-light: #FCD34D;

--neutral-900: #1F2937;      /* Headings */
--neutral-700: #374151;      /* Body text */
--neutral-500: #6B7280;      /* Secondary text */
--neutral-100: #F3F4F6;      /* Backgrounds */
--white: #FFFFFF;
```

**Semantic Colors**
```css
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--info: #3B82F6;
```

### Typography

**Font Stack**
```
Primary: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
Secondary: Space Grotesk, "SF Pro Display", sans-serif
Arabic: Cairo, "Noto Sans Arabic", sans-serif
Code: "Fira Code", "SF Mono", monospace
```

**Type Scale**
```
Display: 72px / 80px (1.1 line-height)
H1: 48px / 56px (1.16 line-height)
H2: 36px / 44px (1.22 line-height)
H3: 28px / 36px (1.28 line-height)
H4: 24px / 32px (1.33 line-height)
Body: 16px / 24px (1.5 line-height)
Small: 14px / 20px (1.42 line-height)
Caption: 12px / 16px (1.33 line-height)
```

## Icon Library

### System Icons (Use Heroicons or Tabler Icons)
```
Navigation: arrow-right, arrow-left, chevron-down
Actions: plus, edit, trash, download, upload
Status: check-circle, x-circle, exclamation-triangle
Commerce: shopping-cart, tag, credit-card, truck
Users: user, users, user-group, identification
```

### Custom Icons Needed
1. **Marketplace** - Network of stores
2. **Wholesaler** - Warehouse with badge
3. **Retailer** - Store front
4. **Logistics** - Delivery truck with route
5. **Wallet** - Digital wallet with currency
6. **Bidding** - Gavel or auction hammer
7. **Multi-region** - Map with pins
8. **Super app** - Grid of services

### Icon Style Guidelines
- Style: Outlined (primary), Filled (emphasis)
- Stroke width: 2px
- Size: 24px (default), 32px (large), 16px (small)
- Color: Inherit from parent or brand colors

## Visual Elements

### Shapes & Patterns

**Geometric Elements**
```svg
<!-- Gradient mesh background -->
<pattern id="mesh">
  <rect fill="url(#gradient)" />
  <circle r="100" fill="#2563EB" opacity="0.1" />
</pattern>

<!-- Dot pattern -->
<pattern id="dots">
  <circle cx="2" cy="2" r="1" fill="#E5E7EB" />
</pattern>
```

**Card Styles**
```css
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  border: 1px solid #E5E7EB;
}

.card-elevated {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
}
```

### Data Visualizations

**Chart Colors**
```javascript
const chartColors = [
  '#2563EB', // Primary blue
  '#10B981', // Green
  '#F59E0B', // Gold
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#06B6D4', // Cyan
];
```

**Chart Types**
1. **Progress bars** - For timeline and completion
2. **Pie charts** - For market share
3. **Line graphs** - For growth metrics
4. **Bar charts** - For comparisons
5. **Sankey diagrams** - For flow visualization

### Photography & Imagery

**Stock Photo Themes**
1. **Business/Professional**
   - Modern office settings
   - Diverse business people
   - Handshakes and meetings
   
2. **Logistics/Delivery**
   - Warehouses
   - Delivery trucks
   - Package handling
   
3. **Technology**
   - Mobile devices
   - Dashboard screens
   - Cloud/network graphics
   
4. **Regional**
   - MENA marketplaces
   - Local businesses
   - Cultural elements

**Image Treatment**
```css
.image-overlay {
  position: relative;
  background: linear-gradient(135deg, 
    rgba(37, 99, 235, 0.9), 
    rgba(16, 185, 129, 0.8));
}

.image-duotone {
  filter: grayscale(100%) contrast(1.2);
  mix-blend-mode: multiply;
}
```

### Illustrations

**Style: Modern, Flat Design**
- Simple geometric shapes
- Limited color palette
- Consistent stroke weights
- Minimal shadows

**Key Illustrations Needed**
1. **Hero illustration** - Marketplace network
2. **Empty states** - No data placeholders
3. **Success states** - Celebration graphics
4. **Error states** - Friendly error messages
5. **Onboarding** - Step-by-step guides

**Illustration Sources**
- unDraw.co (open source)
- Storyset by Freepik
- Humaaans
- DrawKit
- Custom creation in Figma

## Slide Backgrounds

### Background Patterns

**Pattern 1: Subtle Gradient**
```css
background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
opacity: 0.05;
```

**Pattern 2: Mesh Gradient**
```css
background: 
  radial-gradient(at 20% 80%, #2563EB 0, transparent 50%),
  radial-gradient(at 80% 20%, #10B981 0, transparent 50%),
  radial-gradient(at 40% 40%, #F59E0B 0, transparent 50%);
```

**Pattern 3: Geometric**
```svg
<pattern id="geometric">
  <polygon points="0,0 100,0 50,50" fill="#2563EB" opacity="0.03"/>
</pattern>
```

### Section Dividers

**Wave Divider**
```svg
<svg viewBox="0 0 1200 120">
  <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
</svg>
```

## Component Library

### Buttons
```css
.btn-primary {
  background: var(--primary-blue);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
}

.btn-secondary {
  background: white;
  color: var(--primary-blue);
  border: 2px solid var(--primary-blue);
}

.btn-ghost {
  background: transparent;
  color: var(--neutral-700);
}
```

### Cards
```css
.feature-card {
  padding: 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.metric-card {
  padding: 20px;
  border-left: 4px solid var(--primary-blue);
  background: linear-gradient(90deg, #2563EB08 0%, transparent 100%);
}
```

### Badges
```css
.badge {
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

.badge-success {
  background: #10B98120;
  color: #059669;
}

.badge-warning {
  background: #F59E0B20;
  color: #D97706;
}
```

## Animation Guidelines

### Slide Transitions
```css
@keyframes slideIn {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.animate-slide {
  animation: slideIn 0.5s ease-out;
}
```

### Element Animations
```css
/* Fade In */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

/* Scale Up */
.scale-up {
  animation: scaleUp 0.3s ease-out;
}

/* Pulse */
.pulse {
  animation: pulse 2s infinite;
}
```

### Interaction States
```css
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  transition: all 0.2s ease;
}

.interactive:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

## Asset Resources

### Free Resources
1. **Icons**
   - Heroicons.com
   - Tabler-icons.io
   - Feathericons.com
   - Iconify.design

2. **Illustrations**
   - Undraw.co
   - Storyset.com
   - Drawkit.io
   - Humaaans.com

3. **Photos**
   - Unsplash.com
   - Pexels.com
   - Burst.shopify.com
   - Pixabay.com

4. **Patterns**
   - Heropatterns.com
   - Svgbackgrounds.com
   - Patternico.com
   - Bgjar.com

### Figma Plugins
1. **Unsplash** - Stock photos
2. **Iconify** - 100k+ icons
3. **Charts** - Data visualization
4. **MapBox** - Maps integration
5. **Content Reel** - Lorem ipsum
6. **Contrast** - Accessibility checker
7. **Figmotion** - Animations
8. **Able** - Color contrast

### Design Tools
1. **Color Generator** - coolors.co
2. **Gradient Creator** - cssgradient.io
3. **Shadow Generator** - shadows.brumm.af
4. **Pattern Maker** - patternico.com
5. **Mesh Gradients** - meshgradient.com

## Accessibility Guidelines

### Color Contrast
- Text on background: 4.5:1 minimum
- Large text: 3:1 minimum
- Interactive elements: 3:1 minimum

### Font Sizes
- Minimum body text: 16px
- Minimum caption: 12px
- Touch targets: 44x44px minimum

### Visual Hierarchy
1. Use size to indicate importance
2. Use color for emphasis
3. Use spacing for grouping
4. Use contrast for focus

## Export Settings

### Images
```
Format: PNG or WebP
Quality: 90%
Size: 2x for retina
Optimization: TinyPNG
```

### SVGs
```
Format: Optimized SVG
Attributes: Presentation
IDs: Remove unused
Precision: 2 decimal places
```

### PDFs
```
Format: PDF/X-4
Quality: High
Compression: JPEG 90%
Fonts: Embedded subset
```

## Checklist

Before finalizing designs:
- [ ] Brand colors applied consistently
- [ ] Typography hierarchy clear
- [ ] Icons uniform style
- [ ] Images high quality
- [ ] Contrast meets WCAG AA
- [ ] Animations smooth
- [ ] File sizes optimized
- [ ] Assets organized
- [ ] Exports configured
- [ ] Backup created

This comprehensive guide provides all visual specifications needed to create a professional, cohesive, and visually appealing Figma presentation for Rida Technologies.