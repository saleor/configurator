# Saleor Dashboard Monitoring Guide

## Product Management Features - What to Look For

After implementing the complete product management system, here are the key areas and metrics you should monitor in your Saleor dashboard to validate the configurator's functionality.

## 🛍️ Products Section

### **Products Overview**
- **Location**: Dashboard → Catalog → Products
- **Key Metrics to Monitor**:
  - Total product count
  - Products with/without variants
  - Published vs draft products
  - Products with missing images or descriptions

### **What to Validate After Configurator Operations**:

#### After `introspect` Command:
✅ **Product Count Match**: Verify the number of products in your YAML matches dashboard count  
✅ **Product Details**: Spot-check product names, descriptions, and slugs match between YAML and dashboard  
✅ **Variant Information**: Confirm variant count and SKUs are accurately captured  
✅ **Channel Listings**: Verify channel-specific pricing and availability are correctly introspected  

#### After `push` Command (New Products):
✅ **New Product Appears**: Check that newly configured products appear in the product list  
✅ **Correct Product Type**: Verify the product is assigned to the correct product type  
✅ **Category Assignment**: Confirm the product appears in the specified category  
✅ **Variant Creation**: All variants defined in YAML should be created with correct SKUs  
✅ **Attribute Values**: Product attributes should display the configured values  

#### After `push` Command (Product Updates):
✅ **Updated Information**: Changes to descriptions, names, or other fields should be reflected  
✅ **Variant Updates**: Modified variant information (price, weight, etc.) should be updated  
✅ **Channel Listing Changes**: Updated channel-specific settings should be applied  
✅ **New Variants Added**: Any new variants in YAML should be created  
✅ **Preserved Data**: Existing data not in YAML (like images) should remain unchanged  

## 📦 Product Variants

### **Variants Management**
- **Location**: Dashboard → Products → [Product Name] → Variants tab
- **Key Areas to Monitor**:
  - SKU uniqueness and format
  - Pricing consistency across channels
  - Inventory tracking status
  - Variant-specific attributes

### **Validation Checklist**:
✅ **SKU Integrity**: All SKUs should be unique and match your YAML configuration  
✅ **Pricing Accuracy**: Variant prices should match configured values  
✅ **Weight/Dimensions**: Physical properties should be correctly set  
✅ **Channel Availability**: Variants should be available in specified channels only  

## 🏷️ Attributes

### **Attribute Management**
- **Location**: Dashboard → Catalog → Attributes
- **Key Monitoring Points**:
  - Attribute value assignments
  - Reference attribute links
  - Dropdown choice selections

### **What to Verify**:
✅ **Plain Text Attributes**: Values should appear exactly as configured in YAML  
✅ **Dropdown Attributes**: Selected choices should match configured option names/values  
✅ **Reference Attributes**: Links to referenced products should be correctly established  
✅ **Attribute Inheritance**: Product type attributes should be consistently applied  

## 🏪 Channels

### **Channel Listings**
- **Location**: Dashboard → Channels → [Channel Name] → Product availability
- **Critical Areas**:
  - Product publication status
  - Channel-specific pricing
  - Available for purchase dates
  - Visibility settings

### **Monitoring Checklist**:
✅ **Publication Status**: Products should be published/unpublished as configured  
✅ **Channel-Specific Pricing**: Prices should vary correctly between channels  
✅ **Availability Dates**: "Available for purchase" dates should match configuration  
✅ **Currency Display**: Prices should display in correct channel currencies  

## 📊 Key Dashboard Metrics to Track

### **Before vs After Configurator Operations**

| Metric | Before | After | Expected Change |
|--------|---------|-------|-----------------|
| Total Products | X | Y | +New products added |
| Total Variants | X | Y | +New variants added |
| Published Products | X | Y | Based on configuration |
| Products with Attributes | X | Y | Should increase/update |
| Channel Listings | X | Y | Updated per configuration |

### **Health Indicators**

#### 🟢 Healthy Signs:
- Product counts match expectations
- All SKUs are unique and follow your naming convention
- Channel listings are consistent with business rules
- Attribute values are populated and accurate
- No orphaned or misconfigured products

#### 🟡 Warning Signs:
- Products missing from expected categories
- Inconsistent pricing across similar products
- Missing attribute values
- Variants without proper channel listings

#### 🔴 Critical Issues:
- Duplicate SKUs in the system
- Products with missing required fields
- Broken reference attributes
- Products in wrong product types
- Channel listings with incorrect currencies

## 🔍 Troubleshooting Common Dashboard Issues

### **Products Not Appearing**
- Check if product is in "Draft" status instead of "Published"
- Verify the product type exists and is correctly configured
- Confirm the category exists in your category tree
- Review channel listings - product might not be available in current channel

### **Pricing Issues**
- Verify channel-specific pricing configuration
- Check if variant has pricing set vs inheriting from product
- Confirm currency settings match channel configuration
- Review channel listing availability dates

### **Attribute Problems**
- Confirm attribute names exactly match between product types and products
- For dropdown attributes, verify choice names/values are correct
- For reference attributes, ensure referenced products exist
- Check if attributes are properly assigned to product type

### **Variant Issues**
- Verify SKUs are unique across entire Saleor instance
- Check if variants have proper attribute combinations
- Confirm variant pricing is set correctly
- Review variant channel availability

## 📈 Performance Monitoring

### **Recommended Dashboard Checks**

#### Daily:
- New products published correctly
- Channel listing accuracy
- Price consistency

#### Weekly:
- Attribute data quality
- Product categorization accuracy
- Variant inventory levels

#### After Each Configurator Run:
- Complete workflow validation using the test script
- Spot-check key products for accuracy
- Verify no unintended changes occurred

## 🎯 Success Criteria

Your product management implementation is working correctly when:

1. **Round-trip Integrity**: `introspect` → modify → `push` → `introspect` produces identical configurations
2. **Idempotency**: Running `push` twice with the same configuration makes no changes the second time  
3. **Accurate Representation**: All product data in dashboard matches YAML configuration exactly
4. **Dependency Handling**: Product types, categories, and channels are resolved correctly
5. **Error Recovery**: Invalid configurations are rejected with helpful error messages

## 🚀 Pro Tips

- **Use Diff First**: Always run `configurator diff` before `push` to preview changes
- **Test in Staging**: Validate complex changes in a staging environment first
- **Monitor Channel Performance**: Check that channel-specific configurations don't break customer experience
- **Backup Before Major Changes**: Export your configuration before making significant updates
- **Regular Audits**: Periodically compare dashboard state with your YAML to catch drift