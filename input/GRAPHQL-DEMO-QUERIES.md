# GraphQL Demo Queries - Codal B2B Demo

These queries demonstrate Saleor's B2B capabilities for the storefront.
Run these in the GraphQL Playground at `https://<instance>.saleor.cloud/graphql/`

---

## 1. Products & Catalog

### 1.1 List Products with Channel-Specific Pricing

```graphql
query GetProductsWithPricing {
  products(first: 10, channel: "us-b2b") {
    edges {
      node {
        id
        name
        slug
        description
        category {
          name
          slug
        }
        productType {
          name
        }
        # Product-level attributes
        attributes {
          attribute {
            name
            slug
          }
          values {
            name
            slug
          }
        }
        # Variants with pricing
        variants {
          id
          name
          sku
          # Channel-specific pricing
          pricing {
            price {
              gross {
                amount
                currency
              }
              net {
                amount
                currency
              }
            }
            costPrice {
              gross {
                amount
                currency
              }
            }
          }
          # Variant attributes
          attributes {
            attribute {
              name
            }
            values {
              name
            }
          }
        }
      }
    }
  }
}
```

### 1.2 Compare Pricing Across Channels (US vs Canada)

```graphql
# Query 1: US B2B Channel
query GetProductPricingUS {
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

# Query 2: Canada B2B Channel (run separately)
query GetProductPricingCanada {
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

### 1.3 Get Product by SKU (B2B common pattern)

```graphql
query GetProductBySKU {
  productVariant(sku: "PL3000-24-STD", channel: "us-b2b") {
    id
    name
    sku
    product {
      name
      slug
      category {
        name
      }
    }
    pricing {
      price {
        gross {
          amount
          currency
        }
      }
    }
    quantityAvailable
  }
}
```

---

## 2. Categories & Collections

### 2.1 Get Category Hierarchy

```graphql
query GetCategoryHierarchy {
  categories(first: 20, level: 0) {
    edges {
      node {
        id
        name
        slug
        level
        children(first: 10) {
          edges {
            node {
              name
              slug
              level
              children(first: 10) {
                edges {
                  node {
                    name
                    slug
                    level
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 2.2 Get Products in Category with Filters

```graphql
query GetCategoryProducts {
  products(
    first: 20
    channel: "us-b2b"
    filter: {
      categories: ["belt-conveyors"]
    }
  ) {
    totalCount
    edges {
      node {
        name
        slug
        pricing {
          priceRange {
            start {
              gross {
                amount
                currency
              }
            }
            stop {
              gross {
                amount
                currency
              }
            }
          }
        }
      }
    }
  }
}
```

### 2.3 Get Collection Products

```graphql
query GetCollectionProducts {
  collection(slug: "best-sellers", channel: "us-b2b") {
    name
    slug
    products(first: 10) {
      edges {
        node {
          name
          slug
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
        }
      }
    }
  }
}
```

---

## 3. Company Model (B2B Hierarchy)

### 3.1 Get All Companies (Page Type = Company)

```graphql
query GetAllCompanies {
  pages(
    first: 20
    filter: {
      pageTypes: ["Company"]
    }
  ) {
    edges {
      node {
        id
        title
        slug
        # Company attributes
        attributes {
          attribute {
            name
            slug
          }
          values {
            name
            slug
            # For REFERENCE attributes, this gives the referenced entity
            reference
          }
        }
      }
    }
  }
}
```

### 3.2 Get Company with Parent Reference

```graphql
query GetCompanyWithParent {
  page(slug: "acme-east-division") {
    id
    title
    slug
    attributes {
      attribute {
        name
        inputType
      }
      values {
        name
        reference   # For "Parent Company" this will be the parent page ID
      }
    }
  }
}
```

### 3.3 Get Parent Company and All Children

```graphql
# First get the parent company
query GetParentCompany {
  page(slug: "acme-manufacturing-corp") {
    id
    title
    slug
    attributes {
      attribute {
        name
      }
      values {
        name
        reference
      }
    }
  }
}

# Then query for all child companies referencing this parent
# (You'll need the parent's page ID from the first query)
query GetChildCompanies {
  pages(
    first: 20
    filter: {
      pageTypes: ["Company"]
      attributes: [
        {
          slug: "parent-company"
          values: ["acme-manufacturing-corp"]  # slug of parent
        }
      ]
    }
  ) {
    edges {
      node {
        title
        slug
        attributes {
          attribute {
            name
          }
          values {
            name
          }
        }
      }
    }
  }
}
```

---

## 4. Customer & Addresses

### 4.1 Get Customer with Metadata and Addresses

```graphql
query GetCustomerDetails {
  me {
    id
    email
    firstName
    lastName
    # Public metadata (visible to storefront)
    metadata {
      key
      value
    }
    # Private metadata (admin only - won't show for customer)
    # privateMetadata { key value }
    # Multiple addresses for Ship-To / Bill-To
    addresses {
      id
      firstName
      lastName
      companyName
      streetAddress1
      streetAddress2
      city
      cityArea
      postalCode
      country {
        code
        country
      }
      countryArea
      phone
      isDefaultShippingAddress
      isDefaultBillingAddress
      # Address metadata for location codes, etc.
      metadata {
        key
        value
      }
    }
    defaultShippingAddress {
      id
      streetAddress1
      city
    }
    defaultBillingAddress {
      id
      streetAddress1
      city
    }
  }
}
```

### 4.2 Link Customer to Company (Admin Mutation)

```graphql
# This mutation links a customer to a company via private metadata
# Run as admin/staff user
mutation LinkCustomerToCompany($customerId: ID!, $companyPageId: String!) {
  updatePrivateMetadata(
    id: $customerId
    input: [
      { key: "company_id", value: $companyPageId }
      { key: "company_code", value: "ACME-001-EAST" }
      { key: "buyer_type", value: "procurement_manager" }
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

### 4.3 Add Address with Metadata (Ship-To Location Code)

```graphql
mutation AddCustomerAddress {
  accountAddressCreate(
    input: {
      firstName: "John"
      lastName: "Doe"
      companyName: "Acme East Division"
      streetAddress1: "100 Industrial Parkway"
      streetAddress2: "Dock 4B"
      city: "Newark"
      postalCode: "07102"
      country: US
      countryArea: "NJ"
      phone: "+1-800-555-0100"
    }
  ) {
    address {
      id
      streetAddress1
      city
    }
    errors {
      field
      message
    }
  }
}

# Then add metadata to the address
mutation AddAddressMetadata($addressId: ID!) {
  updateMetadata(
    id: $addressId
    input: [
      { key: "location_code", value: "ACME-EAST-DOCK4B" }
      { key: "address_type", value: "ship_to" }
      { key: "delivery_instructions", value: "Call dock manager before delivery" }
    ]
  ) {
    item {
      ... on Address {
        id
        metadata {
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

---

## 5. Checkout Flow

### 5.1 Create Checkout (B2B with PO Number)

```graphql
mutation CreateB2BCheckout {
  checkoutCreate(
    input: {
      channel: "us-b2b"
      email: "buyer@acme-east.demo"
      lines: [
        { quantity: 10, variantId: "UHJvZHVjdFZhcmlhbnQ6MQ==" }  # Replace with actual variant ID
      ]
      shippingAddress: {
        firstName: "John"
        lastName: "Doe"
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
        companyName: "Acme Manufacturing Corp"  # Bill to parent company
        streetAddress1: "500 Corporate Center"
        city: "Chicago"
        postalCode: "60601"
        country: US
        countryArea: "IL"
      }
      # B2B metadata - PO number, cost center, etc.
      metadata: [
        { key: "purchase_order", value: "PO-2024-00123" }
        { key: "cost_center", value: "MFG-EAST-001" }
        { key: "requested_delivery_date", value: "2024-02-15" }
      ]
    }
  ) {
    checkout {
      id
      token
      email
      totalPrice {
        gross {
          amount
          currency
        }
      }
      shippingAddress {
        companyName
        streetAddress1
        city
      }
      billingAddress {
        companyName
        streetAddress1
        city
      }
      metadata {
        key
        value
      }
    }
    errors {
      field
      code
      message
    }
  }
}
```

### 5.2 Get Available Shipping Methods

```graphql
query GetCheckoutShippingMethods($checkoutId: ID!) {
  checkout(id: $checkoutId) {
    id
    shippingMethods {
      id
      name
      price {
        amount
        currency
      }
      minimumDeliveryDays
      maximumDeliveryDays
    }
    availableCollectionPoints {
      id
      name
      clickAndCollectOption
      address {
        streetAddress1
        city
      }
    }
  }
}
```

### 5.3 Apply Voucher Code

```graphql
mutation ApplyVoucher($checkoutId: ID!, $voucherCode: String!) {
  checkoutAddPromoCode(
    id: $checkoutId
    promoCode: $voucherCode
  ) {
    checkout {
      id
      voucherCode
      discount {
        amount
        currency
      }
      totalPrice {
        gross {
          amount
          currency
        }
      }
    }
    errors {
      field
      code
      message
    }
  }
}
```

---

## 6. Orders (For Order History Demo)

### 6.1 Get Customer Orders

```graphql
query GetMyOrders {
  me {
    orders(first: 10) {
      edges {
        node {
          id
          number
          created
          status
          # B2B metadata like PO number
          metadata {
            key
            value
          }
          total {
            gross {
              amount
              currency
            }
          }
          shippingAddress {
            companyName
            streetAddress1
            city
          }
          billingAddress {
            companyName
            streetAddress1
            city
          }
          lines {
            productName
            variantName
            quantity
            unitPrice {
              gross {
                amount
                currency
              }
            }
            totalPrice {
              gross {
                amount
                currency
              }
            }
          }
          invoices {
            id
            number
            status
            url  # Download link
          }
        }
      }
    }
  }
}
```

### 6.2 Get Single Order Detail

```graphql
query GetOrderDetail($orderId: ID!) {
  order(id: $orderId) {
    id
    number
    created
    status
    paymentStatus
    # PO and other B2B metadata
    metadata {
      key
      value
    }
    # Addresses
    shippingAddress {
      companyName
      firstName
      lastName
      streetAddress1
      streetAddress2
      city
      postalCode
      country {
        country
      }
      phone
    }
    billingAddress {
      companyName
      firstName
      lastName
      streetAddress1
      city
      postalCode
      country {
        country
      }
    }
    # Line items
    lines {
      id
      productName
      variantName
      productSku
      quantity
      unitPrice {
        gross {
          amount
          currency
        }
      }
      totalPrice {
        gross {
          amount
          currency
        }
      }
    }
    # Totals
    subtotal {
      gross {
        amount
        currency
      }
    }
    shippingPrice {
      gross {
        amount
        currency
      }
    }
    total {
      gross {
        amount
        currency
      }
    }
    # Invoices
    invoices {
      id
      number
      status
      createdAt
      url
    }
    # Fulfillments
    fulfillments {
      id
      status
      trackingNumber
      lines {
        quantity
        orderLine {
          productName
        }
      }
    }
  }
}
```

---

## 7. Draft Orders (Impersonation / Orders on Behalf)

### 7.1 Create Draft Order for Customer (Admin)

```graphql
mutation CreateDraftOrderForCustomer {
  draftOrderCreate(
    input: {
      user: "VXNlcjoxMjM="  # Customer ID (base64)
      channelId: "Q2hhbm5lbDox"  # us-b2b channel ID
      shippingAddress: {
        firstName: "John"
        lastName: "Doe"
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
      lines: [
        { variantId: "UHJvZHVjdFZhcmlhbnQ6MQ==", quantity: 5 }
      ]
      customerNote: "Rush order - needed by Friday"
      # B2B metadata
      metadata: [
        { key: "purchase_order", value: "PO-2024-00456" }
        { key: "sales_rep", value: "john.smith@industrialsupply.demo" }
        { key: "order_source", value: "phone_order" }
      ]
    }
  ) {
    order {
      id
      number
      status
      user {
        email
      }
      total {
        gross {
          amount
          currency
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

---

## 8. Warehouses & Shipping Zones

### 8.1 Get Warehouses

```graphql
query GetWarehouses {
  warehouses(first: 10) {
    edges {
      node {
        id
        name
        slug
        email
        isPrivate
        clickAndCollectOption
        address {
          streetAddress1
          city
          postalCode
          country {
            country
          }
        }
        shippingZones(first: 10) {
          edges {
            node {
              name
              countries {
                code
                country
              }
            }
          }
        }
      }
    }
  }
}
```

### 8.2 Get Shipping Zones with Methods

```graphql
query GetShippingZones {
  shippingZones(first: 10, channel: "us-b2b") {
    edges {
      node {
        id
        name
        description
        countries {
          code
          country
        }
        warehouses {
          name
          slug
        }
        shippingMethods {
          id
          name
          type
          minimumDeliveryDays
          maximumDeliveryDays
          channelListings {
            channel {
              slug
            }
            price {
              amount
              currency
            }
            minimumOrderPrice {
              amount
            }
            maximumOrderPrice {
              amount
            }
          }
        }
      }
    }
  }
}
```

---

## 9. Channels (Multi-Market)

### 9.1 Get All Channels

```graphql
query GetChannels {
  channels {
    id
    name
    slug
    currencyCode
    defaultCountry {
      code
      country
    }
    isActive
  }
}
```

---

## 10. Useful Admin Queries

### 10.1 Get Staff Permissions

```graphql
query GetStaffPermissions {
  me {
    id
    email
    isStaff
    userPermissions {
      code
      name
    }
  }
}
```

### 10.2 Search Customers (for Impersonation)

```graphql
query SearchCustomers($search: String!) {
  customers(
    first: 10
    filter: {
      search: $search
    }
  ) {
    edges {
      node {
        id
        email
        firstName
        lastName
        # Check company link
        privateMetadata {
          key
          value
        }
        addresses {
          companyName
          city
        }
      }
    }
  }
}
```

---

## Quick Reference: Variable Examples

```json
{
  "checkoutId": "Q2hlY2tvdXQ6YWJjMTIz",
  "orderId": "T3JkZXI6MTIz",
  "customerId": "VXNlcjoxMjM=",
  "addressId": "QWRkcmVzczoxMjM=",
  "companyPageId": "UGFnZToxMjM=",
  "voucherCode": "B2B10",
  "search": "acme"
}
```
