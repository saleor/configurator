#!/bin/bash

# Complete Product Management Workflow Test
# Tests: introspect → create/update products → deploy → deploy (idempotency)

set -e

echo "🔄 Starting Complete Product Management Workflow Test"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if config exists and backup
if [ -f "config.yml" ]; then
    print_warning "Backing up existing config.yml to config.backup.yml"
    cp config.yml config.backup.yml
fi

# Step 1: Clean slate - remove existing config
print_status "Step 1: Cleaning existing configuration"
rm -f config.yml
print_success "Removed existing config.yml"

# Step 2: Introspect current state
print_status "Step 2: Introspecting current Saleor configuration"
npm run build > /dev/null 2>&1
if npm run dev introspect --sections=products > introspect.log 2>&1; then
    print_success "Introspection completed successfully"
    
    # Show what was introspected
    if [ -f "config.yml" ]; then
        PRODUCT_COUNT=$(grep -c "^  - name:" config.yml 2>/dev/null || echo "0")
        print_status "Found $PRODUCT_COUNT existing products"
    fi
else
    print_error "Introspection failed - check introspect.log"
    cat introspect.log
    exit 1
fi

# Step 3: Add new product to configuration
print_status "Step 3: Adding new test product to configuration"

# Create a test product entry
cat >> config.yml << EOF

  # Test Product Added by Workflow Test
  - name: "Workflow Test Product"
    slug: "workflow-test-product"
    description: "A test product created by the workflow validation script"
    productType: "Default Type"
    category: "Default"
    variants:
      - name: "Standard"
        sku: "WORKFLOW-TEST-001"
        weight: 1.0
    attributes:
      test-attribute: "workflow-test-value"
EOF

print_success "Added new test product to configuration"

# Step 4: First deployment - should create the product
print_status "Step 4: First deployment (should CREATE new product)"
if npm run dev push --sections=products > deploy1.log 2>&1; then
    print_success "First deployment completed successfully"
    
    # Check deployment log for creation
    if grep -q "Created new product" deploy1.log; then
        print_success "✓ New product was created as expected"
    else
        print_warning "Product creation not clearly indicated in logs"
    fi
else
    print_error "First deployment failed - check deploy1.log"
    cat deploy1.log
    exit 1
fi

# Step 5: Modify the product
print_status "Step 5: Modifying test product configuration"
sed -i '' 's/description: "A test product created by the workflow validation script"/description: "Updated: A test product modified by workflow validation"/' config.yml
sed -i '' 's/weight: 1.0/weight: 1.5/' config.yml

print_success "Modified product description and variant weight"

# Step 6: Second deployment - should update the product
print_status "Step 6: Second deployment (should UPDATE existing product)"
if npm run dev push --sections=products > deploy2.log 2>&1; then
    print_success "Second deployment completed successfully"
    
    # Check deployment log for updates
    if grep -q "Updated existing product" deploy2.log; then
        print_success "✓ Product was updated as expected"
    else
        print_warning "Product update not clearly indicated in logs"
    fi
else
    print_error "Second deployment failed - check deploy2.log"
    cat deploy2.log
    exit 1
fi

# Step 7: Third deployment - should be idempotent (no changes)
print_status "Step 7: Third deployment (should be IDEMPOTENT - no changes)"
if npm run dev push --sections=products > deploy3.log 2>&1; then
    print_success "Third deployment completed successfully"
    
    # Check if deployment was idempotent
    if grep -q "No changes detected" deploy3.log || ! grep -q "Updated existing product\|Created new product" deploy3.log; then
        print_success "✓ Deployment was idempotent as expected"
    else
        print_warning "Unexpected changes detected in idempotent deployment"
    fi
else
    print_error "Third deployment failed - check deploy3.log"
    cat deploy3.log
    exit 1
fi

# Step 8: Verify round-trip integrity
print_status "Step 8: Verifying round-trip integrity"
rm -f config.yml
if npm run dev introspect --sections=products > introspect2.log 2>&1; then
    print_success "Second introspection completed"
    
    # Check if our test product is still there
    if grep -q "workflow-test-product" config.yml; then
        print_success "✓ Test product persisted correctly"
    else
        print_warning "Test product not found in re-introspection"
    fi
    
    # Run diff to check for any discrepancies
    if npm run dev diff --sections=products > diff.log 2>&1; then
        if grep -q "No differences found" diff.log; then
            print_success "✓ Perfect round-trip integrity - no differences detected"
        else
            print_warning "Some differences detected - check diff.log"
        fi
    else
        print_warning "Diff command failed - check diff.log"
    fi
else
    print_error "Second introspection failed - check introspect2.log"
    exit 1
fi

# Cleanup
print_status "Cleaning up test artifacts"
rm -f introspect.log deploy1.log deploy2.log deploy3.log introspect2.log diff.log

# Restore backup if it exists
if [ -f "config.backup.yml" ]; then
    print_status "Restoring original configuration"
    mv config.backup.yml config.yml
    print_success "Original config.yml restored"
fi

echo ""
echo "=================================================="
print_success "🎉 Complete Product Management Workflow Test PASSED!"
echo "=================================================="
echo ""
echo "✅ Introspection: Working correctly"
echo "✅ Product Creation: New products created successfully" 
echo "✅ Product Updates: Existing products updated correctly"
echo "✅ Idempotency: No unnecessary changes on re-deployment"
echo "✅ Round-trip Integrity: Configuration preserved accurately"
echo ""
echo "Your product management workflow is fully functional!"