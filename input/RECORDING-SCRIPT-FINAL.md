# Saleor B2B Demo Recording Script
## Codal $250M Opportunity - Complete Walkthrough

**Recording Tool:** Loom
**Target Duration:** 20-25 minutes
**Instance URL:** `https://<your-instance>.saleor.cloud/graphql/`

---

## PRE-RECORDING CHECKLIST

Before recording, ensure you have:

- [ ] Saleor Dashboard open
- [ ] GraphQL Playground open in another tab
- [ ] Storefront open (if available)
- [ ] At least one test customer created
- [ ] One customer linked to a company via privateMetadata

---

# PART 1: ADMIN CAPABILITIES (10-12 min)

---

## 1.1 Products & Catalog Management
**Checklist:** Management of products and catalogs

### Show in Dashboard:

1. **Navigate to:** Catalog → Products
2. **Show:** Product list with filters, search, bulk actions
3. **Click into:** "ProLine 3000 Belt Conveyor System"
4. **Point out:**
   - Product attributes (Manufacturer, Model Number, Warranty)
   - Multiple variants (Standard, Heavy Duty)
   - Channel-specific pricing (scroll to variants section)

### Say:
> "Saleor provides complete catalog management. Each product has typed attributes defined by product types, and supports multiple variants. Notice the channel-specific pricing - the same product can have different prices for US vs Canada markets."

---

## 1.2 Multi-Channel Pricing
**Checklist:** Management of pricing, Pricing engine capabilities

### Show in Dashboard:

1. **Navigate to:** Configuration → Channels
2. **Show:** US B2B, Canada B2B, Mexico B2B channels
3. **Click into:** US B2B channel
4. **Point out:** Currency (USD), default country, settings

### GraphQL Demo - Compare Pricing Across Channels:

```graphql
# US B2B Pricing
query USPricing {
  product(slug: "proline-3000-conveyor", channel: "us-b2b") {
    name
    variants {
      name
      sku
      pricing {
        price {
          gross {
            amount
            currency
          }
        }
      }
    }
  }
}
```

**Run this, then change channel to `canada-b2b`:**

```graphql
# Canada B2B Pricing - Same product, different price!
query CanadaPricing {
  product(slug: "proline-3000-conveyor", channel: "canada-b2b") {
    name
    variants {
      name
      sku
      pricing {
        price {
          gross {
            amount
            currency
          }
        }
      }
    }
  }
}
```

### Say:
> "The pricing engine supports channel-specific pricing natively. The same conveyor system is $12,500 USD in the US channel and $16,250 CAD in Canada. This is configured per-variant, giving complete flexibility for international B2B pricing strategies."

---

## 1.3 Company Hierarchy (Parent-Child / Ship-To / Bill-To)
**Checklist:** Maintaining hierarchy between parent company and multiple child relationships

### Show in Dashboard:

1. **Navigate to:** Content → Models
2. **Filter by:** Model Type = "Company"
3. **Show the list:** Point out the company hierarchy
4. **Click into:** "Acme East Division"
5. **Scroll to:** "Parent Company" attribute
6. **Click the reference:** Navigate to "Acme Manufacturing Corp"

### Say:
> "For B2B company hierarchies, we've modeled companies as structured content using Saleor's Models feature. Each company has attributes like Company Code, Payment Terms, Credit Limit, and importantly - a Parent Company reference.
>
> Here's Acme East Division - a child company. Notice the Parent Company field references Acme Manufacturing Corp. This gives us the Ship-To / Bill-To relationship - the child is a shipping location, the parent is the billing entity."

### GraphQL Demo - Get Company Hierarchy:

```graphql
# Get a child company with its parent reference
query GetCompanyWithParent {
  page(slug: "acme-east-division") {
    id
    title
    attributes {
      attribute {
        name
        inputType
      }
      values {
        name
        reference  # Parent company's Page ID
      }
    }
  }
}
```

```graphql
# Get ALL child companies of a parent
query GetAllChildCompanies {
  pages(
    first: 20
    filter: {
      pageTypes: ["Company"]
    }
  ) {
    edges {
      node {
        title
        slug
        attributes {
          attribute { name }
          values {
            name
            reference
          }
        }
      }
    }
  }
}
```

### Say:
> "Via GraphQL, we can query the company hierarchy. This query shows Acme East Division with its parent reference. In your storefront, you'd use this to display the company structure, enforce credit limits from the parent, or route invoices to the parent's billing address."

---

## 1.4 Customer-Company Linking
**Checklist:** (Part of hierarchy management)

### Show in Dashboard:

1. **Navigate to:** Customers
2. **Click into** a test customer
3. **Show:** Multiple addresses section

### GraphQL Demo - Link Customer to Company:

```graphql
# First, get a customer's ID
query GetCustomers {
  customers(first: 5) {
    edges {
      node {
        id
        email
        firstName
        lastName
      }
    }
  }
}
```

```graphql
# Link customer to their company via privateMetadata
mutation LinkCustomerToCompany {
  updatePrivateMetadata(
    id: "VXNlcjox"  # Replace with actual customer ID from above
    input: [
      { key: "company_id", value: "acme-east-division" }
      { key: "company_code", value: "ACME-001-EAST" }
      { key: "buyer_role", value: "procurement_manager" }
      { key: "can_approve_orders", value: "true" }
      { key: "spending_limit", value: "50000" }
    ]
  ) {
    item {
      ... on User {
        id
        email
        privateMetadata {
          key
          value
        }
      }
    }
    errors {
      field
      message
    }
  }
}
```

### Say:
> "Customers are linked to companies via private metadata. This mutation associates a buyer with Acme East Division and sets their role and spending limit. The privateMetadata is only visible to admins, not the customer themselves - perfect for internal business rules."

---

## 1.5 Plugins & Integrations (Vertex, ElasticSearch)
**Checklist:** Access and manage plug-ins/tools

### Show in Dashboard:

1. **Navigate to:** Configuration → Webhooks & Events → Apps
2. **Show:** Available apps / installed apps
3. **Navigate to:** Configuration → Taxes
4. **Show:** Tax configuration with TAX_APP strategy

### Say:
> "Saleor has a robust app ecosystem. For tax calculation, we support external providers like Vertex and Avalara through our Tax App integration. Notice the tax strategy is set to 'TAX_APP' - meaning an external tax service calculates rates at checkout.
>
> For search, we integrate with Algolia, ElasticSearch, or any provider via our GraphQL API and webhooks. The search is fully customizable on the storefront side."

---

## 1.6 Promotions & Discounts
**Checklist:** Management of promotions

### Show in Dashboard:

1. **Navigate to:** Discounts → Vouchers
2. **Click:** Create Voucher
3. **Create a voucher:**
   - Code: `B2B15`
   - Discount type: Percentage
   - Value: 15%
   - Minimum order value: $500
   - Usage limit: 100
   - Channel: US B2B
4. **Save** the voucher

### GraphQL Demo - Query Vouchers:

```graphql
query GetVouchers {
  vouchers(first: 10, channel: "us-b2b") {
    edges {
      node {
        id
        code
        discountValueType
        discountValue
        minCheckoutItemsQuantity
        usageLimit
        used
        startDate
        endDate
      }
    }
  }
}
```

### Say:
> "Promotions are managed through vouchers. We just created a 15% discount for B2B customers with a $500 minimum order. Vouchers can be percentage or fixed amount, limited by usage count, date range, and specific channels. We'll apply this at checkout later in the demo."

---

## 1.7 Impersonation / Orders on Behalf
**Checklist:** Impersonation, CAP placing orders on behalf of customer

### Show in Dashboard:

1. **Navigate to:** Customers
2. **Select** a customer (e.g., john.buyer@acme.com)
3. **Click:** "Create Order" button (top right)
4. **Show:** Draft order screen
5. **Point out:**
   - Customer is pre-selected
   - Can add products
   - Can select from customer's saved addresses
   - Can add notes
   - Can apply vouchers

### Say:
> "For impersonation and phone orders, sales reps can create orders on behalf of any customer. Click 'Create Order' on a customer profile, and you're creating a draft order as that customer. You can select from their saved addresses, apply their contracted pricing, and add internal notes."

### GraphQL Demo - Create Draft Order:

```graphql
mutation CreateDraftOrderForCustomer {
  draftOrderCreate(
    input: {
      user: "VXNlcjox"  # Customer ID
      channelId: "Q2hhbm5lbDox"  # us-b2b channel ID
      customerNote: "Phone order - rush delivery requested"
      shippingAddress: {
        firstName: "John"
        lastName: "Buyer"
        companyName: "Acme East Division"
        streetAddress1: "100 Industrial Parkway"
        city: "Newark"
        postalCode: "07102"
        country: US
        countryArea: "NJ"
      }
      billingAddress: {
        firstName: "Accounts"
        lastName: "Payable"
        companyName: "Acme Manufacturing Corp"
        streetAddress1: "500 Corporate Center"
        city: "Chicago"
        postalCode: "60601"
        country: US
        countryArea: "IL"
      }
    }
  ) {
    order {
      id
      number
      status
      user {
        email
      }
    }
    errors {
      field
      message
    }
  }
}
```

### Say:
> "Programmatically, this is a draftOrderCreate mutation. Notice the shipping address is the child company location, but billing goes to the parent company headquarters. This is exactly the Ship-To / Bill-To pattern B2B customers need."

---

## 1.8 Roles & Permissions
**Checklist:** Roles and permissions management

### Show in Dashboard:

1. **Navigate to:** Configuration → Staff
2. **Show:** List of staff members
3. **Click:** Create Staff Member (or edit existing)
4. **Show:** Permission checkboxes
5. **Point out:** Different permission groups:
   - Full admin
   - Orders only (for sales reps)
   - Catalog only (for product managers)
   - Read-only (for analysts)

### Say:
> "Saleor has granular permissions. You can create staff with specific access - a sales rep might only manage orders and customers, while a product manager only manages catalog. Permission groups make this easy to manage at scale."

---

# PART 2: UX / FRONTEND (6-8 min)

---

## 2.1 Product Listing Page (PLP)
**Checklist:** PLP

### Show in Dashboard (or Storefront if available):

1. **Navigate to:** Catalog → Categories → Equipment → Conveyor Systems
2. **Show:** Products in category
3. **Point out:** Filtering, sorting capabilities

### GraphQL Demo - PLP Query:

```graphql
query ProductListingPage {
  products(
    first: 20
    channel: "us-b2b"
    filter: {
      categories: ["conveyors"]
    }
    sortBy: {
      field: NAME
      direction: ASC
    }
  ) {
    totalCount
    edges {
      node {
        id
        name
        slug
        thumbnail {
          url
        }
        pricing {
          priceRange {
            start {
              gross {
                amount
                currency
              }
            }
          }
        }
        category {
          name
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Say:
> "For the Product Listing Page, this query fetches products by category with pagination. The storefront gets product names, thumbnails, pricing, and can implement filtering by attributes, price range, or any product field."

---

## 2.2 Product Detail Page (PDP)
**Checklist:** PDP

### GraphQL Demo - PDP Query:

```graphql
query ProductDetailPage {
  product(slug: "proline-3000-conveyor", channel: "us-b2b") {
    id
    name
    slug
    description
    # Product images
    media {
      url
      alt
    }
    # Product attributes (Manufacturer, Model, etc.)
    attributes {
      attribute {
        name
        slug
      }
      values {
        name
      }
    }
    # Category breadcrumb
    category {
      name
      slug
      ancestors(first: 5) {
        edges {
          node {
            name
            slug
          }
        }
      }
    }
    # Variants with pricing
    variants {
      id
      name
      sku
      quantityAvailable
      attributes {
        attribute { name }
        values { name }
      }
      pricing {
        price {
          gross {
            amount
            currency
          }
        }
      }
    }
    # Related products
    relatedProducts: attributes(
      filter: { slugs: ["related-products"] }
    ) {
      values {
        reference
      }
    }
  }
}
```

### Say:
> "The PDP query fetches everything needed for a product page - description, images, attributes, category breadcrumb, all variants with availability and pricing. For B2B, notice quantityAvailable for inventory visibility and the ability to show related products."

---

## 2.3 Checkout Flow & Customization
**Checklist:** General checkout flow, flexibility for customizations, bypassing steps

### GraphQL Demo - Complete Checkout Flow:

```graphql
# STEP 1: Create checkout
mutation CreateCheckout {
  checkoutCreate(
    input: {
      channel: "us-b2b"
      email: "john.buyer@acme-east.com"
      lines: [
        { variantId: "UHJvZHVjdFZhcmlhbnQ6MQ==", quantity: 5 }
      ]
      # B2B metadata - PO number, cost center
      metadata: [
        { key: "purchase_order", value: "PO-2024-00789" }
        { key: "cost_center", value: "MFG-EAST-001" }
        { key: "requested_delivery", value: "2024-02-15" }
      ]
    }
  ) {
    checkout {
      id
      token
      totalPrice {
        gross { amount currency }
      }
    }
    errors { field code message }
  }
}
```

```graphql
# STEP 2: Set shipping address
mutation SetShippingAddress {
  checkoutShippingAddressUpdate(
    id: "CHECKOUT_ID_HERE"
    shippingAddress: {
      firstName: "John"
      lastName: "Buyer"
      companyName: "Acme East Division"
      streetAddress1: "100 Industrial Parkway"
      city: "Newark"
      postalCode: "07102"
      country: US
      countryArea: "NJ"
      phone: "+1-800-555-0100"
    }
  ) {
    checkout {
      id
      shippingMethods {
        id
        name
        price { amount currency }
        minimumDeliveryDays
        maximumDeliveryDays
      }
    }
    errors { field code message }
  }
}
```

```graphql
# STEP 3: Set billing address (can be different - Bill-To)
mutation SetBillingAddress {
  checkoutBillingAddressUpdate(
    id: "CHECKOUT_ID_HERE"
    billingAddress: {
      firstName: "Accounts"
      lastName: "Payable"
      companyName: "Acme Manufacturing Corp"
      streetAddress1: "500 Corporate Center"
      city: "Chicago"
      postalCode: "60601"
      country: US
      countryArea: "IL"
    }
  ) {
    checkout {
      id
      billingAddress {
        companyName
        city
      }
    }
    errors { field code message }
  }
}
```

```graphql
# STEP 4: Select shipping method
mutation SelectShipping {
  checkoutDeliveryMethodUpdate(
    id: "CHECKOUT_ID_HERE"
    deliveryMethodId: "SHIPPING_METHOD_ID"
  ) {
    checkout {
      id
      totalPrice {
        gross { amount currency }
      }
    }
    errors { field code message }
  }
}
```

### Say:
> "The checkout is a series of GraphQL mutations - completely headless. Each step is independent, so you can customize the flow entirely. Want to skip address entry for logged-in users? Just pre-fill from their saved addresses. Need a PO number field? Add it to metadata. The storefront has complete control."

---

## 2.4 Applying Promotions at Checkout
**Checklist:** Application of promotions

### GraphQL Demo:

```graphql
# Apply the voucher we created earlier
mutation ApplyVoucher {
  checkoutAddPromoCode(
    id: "CHECKOUT_ID_HERE"
    promoCode: "B2B15"
  ) {
    checkout {
      id
      voucherCode
      discount {
        amount
        currency
      }
      subtotalPrice {
        gross { amount currency }
      }
      totalPrice {
        gross { amount currency }
      }
      lines {
        totalPrice {
          gross { amount currency }
        }
        undiscountedTotalPrice {
          amount
          currency
        }
      }
    }
    errors { field code message }
  }
}
```

### Say:
> "Vouchers are applied with a simple mutation. The response shows the discount amount and updated totals. Notice we can see both the discounted price and the original undiscounted price - useful for showing savings to the customer."

---

## 2.5 Order History & Invoices
**Checklist:** Order/OrderHistory, Invoice/Invoice History, Order Detail Page

### GraphQL Demo:

```graphql
# Customer's order history
query MyOrderHistory {
  me {
    orders(first: 10) {
      edges {
        node {
          id
          number
          created
          status
          paymentStatus
          # B2B metadata (PO number, etc.)
          metadata {
            key
            value
          }
          total {
            gross { amount currency }
          }
          # Invoices
          invoices {
            id
            number
            status
            createdAt
            url  # PDF download link
          }
        }
      }
    }
  }
}
```

```graphql
# Single order detail
query OrderDetail {
  order(id: "T3JkZXI6MTIz") {
    id
    number
    created
    status
    # PO number from metadata
    metafield(key: "purchase_order")

    # Ship-To
    shippingAddress {
      companyName
      streetAddress1
      city
      postalCode
      country { country }
    }
    # Bill-To
    billingAddress {
      companyName
      streetAddress1
      city
      postalCode
      country { country }
    }
    # Line items
    lines {
      productName
      variantName
      productSku
      quantity
      unitPrice {
        gross { amount currency }
      }
      totalPrice {
        gross { amount currency }
      }
    }
    # Totals
    subtotal { gross { amount currency } }
    shippingPrice { gross { amount currency } }
    total { gross { amount currency } }
    # Invoices
    invoices {
      id
      number
      url
      createdAt
    }
    # Fulfillment tracking
    fulfillments {
      status
      trackingNumber
      created
    }
  }
}
```

### Say:
> "Order history shows all past orders with status, totals, and invoice links. The detail view includes everything - Ship-To and Bill-To addresses, line items, the PO number from metadata, and downloadable invoice PDFs. Fulfillment tracking is also available."

---

## 2.6 CMS Capabilities
**Checklist:** CMS Capabilities

### Show in Dashboard:

1. **Navigate to:** Content → Pages
2. **Show:** Different page types (Product Information, Resource Article)
3. **Click into** a page to show attributes

### GraphQL Demo:

```graphql
query GetCMSPage {
  page(slug: "acme-manufacturing-corp") {
    title
    content  # Rich text content
    pageType {
      name
    }
    attributes {
      attribute { name }
      values { name }
    }
  }
}

# Get pages by type (e.g., all Resource Articles)
query GetArticles {
  pages(
    first: 10
    filter: { pageTypes: ["Resource Article"] }
  ) {
    edges {
      node {
        title
        slug
        attributes {
          attribute { name }
          values { name }
        }
      }
    }
  }
}
```

### Say:
> "Saleor includes headless CMS capabilities. We've created page types for Resource Articles, Product Information sheets, and our Company models. Each has typed attributes - the storefront queries pages by type and renders them appropriately."

---

## 2.7 Approval Workflow
**Checklist:** Approval Workflow

### Say:
> "For B2B approval workflows, Saleor supports this through several mechanisms:
>
> 1. **Draft Orders** - Orders can be created as drafts requiring manager approval before payment
> 2. **Order Metadata** - Store approval status, approver, timestamps
> 3. **Webhooks** - ORDER_CREATED triggers your approval service
> 4. **Customer Metadata** - We stored 'spending_limit' and 'can_approve_orders' on customers
>
> Your storefront checks if order total exceeds the buyer's spending limit, and if so, creates a draft order that routes to their manager for approval via your workflow system."

### GraphQL Demo - Check Spending Limit:

```graphql
# Storefront checks customer's limit before completing checkout
query CheckBuyerLimits {
  me {
    privateMetadata {
      key
      value
    }
  }
}

# If over limit, create draft order for approval
mutation CreateDraftForApproval {
  draftOrderCreate(
    input: {
      user: "VXNlcjox"
      channelId: "Q2hhbm5lbDox"
      metadata: [
        { key: "requires_approval", value: "true" }
        { key: "requested_by", value: "john.buyer@acme.com" }
        { key: "approval_status", value: "pending" }
      ]
      lines: [
        { variantId: "UHJvZHVjdFZhcmlhbnQ6MQ==", quantity: 100 }
      ]
    }
  ) {
    order {
      id
      number
      status
    }
    errors { field message }
  }
}
```

---

# PART 3: DEVELOPER CONSIDERATIONS (3-4 min)

---

## 3.1 Custom Checkout Code
**Checklist:** Ability to add custom code to edit the checkout flow

### Say:
> "The checkout is entirely headless - it's just GraphQL mutations. Your frontend has complete control:
>
> - **Skip steps** - Pre-fill addresses for logged-in users
> - **Add steps** - PO number entry, delivery date selection, approval routing
> - **Custom validation** - Check credit limits, inventory, shipping restrictions
> - **Integrate external services** - Tax calculation, address verification, fraud detection
>
> There's no 'checkout page' in Saleor - you build exactly what your business needs."

### Show GraphQL Playground:

Point to the checkout mutations we ran earlier and emphasize they're independent, chainable steps.

---

## 3.2 Extensibility & Custom Flows
**Checklist:** Ability to add custom code to other core screens/flows

### Say:
> "Everything in Saleor is extensible:
>
> - **Apps** - Server-side plugins for custom business logic
> - **Webhooks** - React to any event (order created, payment received, etc.)
> - **Metadata** - Add custom fields to any object without schema changes
> - **Storefront** - Complete freedom, use any frontend framework
>
> The Dashboard can also be extended with Dashboard Extensions for custom admin screens."

### GraphQL Demo - Webhooks:

```graphql
query GetWebhooks {
  apps(first: 10) {
    edges {
      node {
        name
        webhooks {
          name
          targetUrl
          events {
            eventType
          }
        }
      }
    }
  }
}
```

---

# PART 4: OPTIONAL FEATURES (2 min)

---

## 4.1 Delayed/Scheduled Shipments
**Checklist:** Multiple delayed mailing shipments

### Say:
> "For scenarios like quarterly mailings or scheduled deliveries:
>
> 1. **Pre-orders** - Accept orders for future fulfillment dates
> 2. **Order Metadata** - Store `scheduled_ship_date` on the order
> 3. **Custom Apps** - Build fulfillment scheduling logic
> 4. **Webhooks** - Trigger fulfillment based on date
>
> The order is placed January 1st, metadata specifies 'ship Q2', and your fulfillment system processes it when the date arrives. Saleor doesn't auto-ship - you control the fulfillment timing."

---

# QUICK REFERENCE: All GraphQL Queries

## Utility Queries (Run First to Get IDs)

```graphql
# Get channel IDs
query GetChannels {
  channels {
    id
    name
    slug
  }
}

# Get product variant IDs
query GetVariants {
  products(first: 5, channel: "us-b2b") {
    edges {
      node {
        name
        variants {
          id
          name
          sku
        }
      }
    }
  }
}

# Get customer IDs
query GetCustomers {
  customers(first: 5) {
    edges {
      node {
        id
        email
      }
    }
  }
}

# Get company (model) IDs
query GetCompanies {
  pages(filter: { pageTypes: ["Company"] }, first: 10) {
    edges {
      node {
        id
        title
        slug
      }
    }
  }
}
```

---

# DEMO FLOW SUMMARY

| Time | Section | Key Point |
|------|---------|-----------|
| 0:00 | Intro | "B2B demo for Industrial Supply scenario" |
| 1:00 | Products | Product types, attributes, variants |
| 3:00 | Channel Pricing | Same product, different prices US/CA |
| 5:00 | **Company Hierarchy** | Parent-child model, Ship-To/Bill-To |
| 8:00 | Customer-Company Link | privateMetadata linking |
| 10:00 | Plugins/Tax | Vertex, ElasticSearch integration points |
| 11:00 | Promotions | Create and show voucher |
| 13:00 | Impersonation | Draft order for customer |
| 14:00 | Permissions | Staff roles |
| 15:00 | PLP/PDP | GraphQL queries for storefront |
| 17:00 | Checkout | Full flow with PO number, different Bill-To |
| 19:00 | Apply Discount | B2B15 voucher |
| 20:00 | Orders/Invoices | History, detail, PDF download |
| 21:00 | CMS | Page types and models |
| 22:00 | Approval Workflow | Spending limits, draft orders |
| 23:00 | Developer | Headless flexibility |
| 24:00 | Wrap-up | "Enterprise B2B ready" |

---

# CLOSING STATEMENT

> "That covers Saleor's B2B capabilities - multi-channel pricing, company hierarchies with parent-child relationships for Ship-To and Bill-To, flexible promotions, order-on-behalf workflows, and complete headless customization. The platform is enterprise-ready and built for complex B2B scenarios like this one. Happy to dive deeper into any area."

---

# POST-RECORDING

Upload to Loom and share the link with Codal.
