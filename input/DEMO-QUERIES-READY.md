# Ready-to-Use Demo Queries
## All IDs Pre-filled - Copy & Paste During Recording

---

## YOUR REFERENCE IDs

| Entity | ID | Value |
|--------|-----|-------|
| **US B2B Channel** | `Q2hhbm5lbDozOQ==` | us-b2b |
| **Customer** | `VXNlcjoxMjI=` | john@doe.com |
| **Product Variant** | `UHJvZHVjdFZhcmlhbnQ6NjY4` | ProLine 3000 Standard ($12,000) |
| **Acme East (Child)** | `UGFnZTo0MQ==` | ACME-001-EAST |
| **Acme Manufacturing (Parent)** | `UGFnZTo0MA==` | ACME-001 |
| **Voucher Code** | `3b14ea0e-dd2d-4eee-88cf-eeba01fe8601` | |

---

# PART 1: PRODUCTS & PRICING

## 1.1 Get Product with Pricing (US)

```graphql
query ProductPricingUS {
  products(first: 5, channel: "us-b2b") {
    edges {
      node {
        name
        variants {
          id
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
  }
}
```

## 1.2 Compare Pricing - Canada Channel

```graphql
query ProductPricingCanada {
  products(first: 5, channel: "canada-b2b") {
    edges {
      node {
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
  }
}
```

---

# PART 2: COMPANY HIERARCHY

## 2.1 Get All Companies

```graphql
query GetAllCompanies {
  pages(first: 15) {
    edges {
      node {
        id
        title
        slug
        pageType {
          name
        }
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

## 2.2 Get Child Company with Parent Reference

```graphql
query GetChildCompanyWithParent {
  page(id: "UGFnZTo0MQ==") {
    id
    title
    attributes {
      attribute {
        name
        inputType
      }
      values {
        name
        reference
      }
    }
  }
}
```

## 2.3 Get Parent Company Details

```graphql
query GetParentCompany {
  page(id: "UGFnZTo0MA==") {
    id
    title
    attributes {
      attribute { name }
      values { name }
    }
  }
}
```

---

# PART 3: CUSTOMER-COMPANY LINK

## 3.1 Get Customer with Company Metadata

```graphql
query GetCustomerWithCompany {
  user(id: "VXNlcjoxMjI=") {
    id
    email
    firstName
    lastName
    privateMetadata {
      key
      value
    }
    addresses {
      companyName
      streetAddress1
      city
      country {
        country
      }
    }
  }
}
```

## 3.2 Link Another Customer to Company (if needed)

```graphql
mutation LinkCustomerToCompany {
  updatePrivateMetadata(
    id: "VXNlcjoxMjI="
    input: [
      { key: "company_id", value: "UGFnZTo0MQ==" }
      { key: "company_slug", value: "acme-east-division" }
      { key: "company_code", value: "ACME-001-EAST" }
      { key: "buyer_role", value: "procurement_manager" }
      { key: "spending_limit", value: "50000" }
    ]
  ) {
    item {
      ... on User {
        email
        privateMetadata {
          key
          value
        }
      }
    }
    errors { field message }
  }
}
```

---

# PART 4: CHECKOUT FLOW

## 4.1 Create Checkout with B2B Metadata

```graphql
mutation CreateB2BCheckout {
  checkoutCreate(
    input: {
      channel: "us-b2b"
      email: "john@doe.com"
      lines: [
        {
          variantId: "UHJvZHVjdFZhcmlhbnQ6NjY4"
          quantity: 2
        }
      ]
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
      email
      totalPrice {
        gross {
          amount
          currency
        }
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

## 4.2 Set Shipping Address (Ship-To: Child Company)

**⚠️ Replace `CHECKOUT_ID` with the `id` from Step 4.1**

```graphql
mutation SetShippingAddress {
  checkoutShippingAddressUpdate(
    id: "CHECKOUT_ID"
    shippingAddress: {
      firstName: "John"
      lastName: "Doe"
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
      shippingAddress {
        companyName
        city
      }
      shippingMethods {
        id
        name
        price {
          amount
          currency
        }
      }
    }
    errors { field code message }
  }
}
```

## 4.3 Set Billing Address (Bill-To: Parent Company)

```graphql
mutation SetBillingAddress {
  checkoutBillingAddressUpdate(
    id: "CHECKOUT_ID"
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
      shippingAddress {
        companyName
        city
      }
      billingAddress {
        companyName
        city
      }
    }
    errors { field code message }
  }
}
```

## 4.4 Select Shipping Method

**⚠️ Replace `SHIPPING_METHOD_ID` with ID from Step 4.2 response**

```graphql
mutation SelectShippingMethod {
  checkoutDeliveryMethodUpdate(
    id: "CHECKOUT_ID"
    deliveryMethodId: "SHIPPING_METHOD_ID"
  ) {
    checkout {
      id
      deliveryMethod {
        ... on ShippingMethod {
          name
        }
      }
      totalPrice {
        gross {
          amount
          currency
        }
      }
    }
    errors { field code message }
  }
}
```

## 4.5 Apply Voucher/Promo Code

```graphql
mutation ApplyVoucher {
  checkoutAddPromoCode(
    id: "CHECKOUT_ID"
    promoCode: "3b14ea0e-dd2d-4eee-88cf-eeba01fe8601"
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
    }
    errors { field code message }
  }
}
```

---

# PART 5: ORDERS & INVOICES

## 5.1 Get Customer's Order History

```graphql
query GetOrderHistory {
  me {
    orders(first: 10) {
      edges {
        node {
          id
          number
          created
          status
          total {
            gross { amount currency }
          }
          invoices {
            id
            number
            url
          }
        }
      }
    }
  }
}
```

## 5.2 Get Order Detail (Admin)

**⚠️ Replace `ORDER_ID` with actual order ID**

```graphql
query GetOrderDetail {
  order(id: "ORDER_ID") {
    id
    number
    status
    metadata {
      key
      value
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
      quantity
      totalPrice {
        gross { amount currency }
      }
    }
    total {
      gross { amount currency }
    }
    invoices {
      number
      url
      status
    }
  }
}
```

---

# PART 6: DRAFT ORDER (IMPERSONATION)

## 6.1 Create Order on Behalf of Customer

```graphql
mutation CreateDraftOrderForCustomer {
  draftOrderCreate(
    input: {
      user: "VXNlcjoxMjI="
      channelId: "Q2hhbm5lbDozOQ=="
      customerNote: "Phone order - rush delivery requested"
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
      metadata: [
        { key: "purchase_order", value: "PO-2024-PHONE-001" }
        { key: "sales_rep", value: "demo@saleor.io" }
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
      metadata {
        key
        value
      }
    }
    errors { field message }
  }
}
```

## 6.2 Add Line to Draft Order

**⚠️ Replace `DRAFT_ORDER_ID` with ID from Step 6.1**

```graphql
mutation AddLineToDraft {
  draftOrderLinesCreate(
    id: "DRAFT_ORDER_ID"
    input: [
      {
        variantId: "UHJvZHVjdFZhcmlhbnQ6NjY4"
        quantity: 3
      }
    ]
  ) {
    order {
      id
      lines {
        productName
        quantity
        totalPrice {
          gross { amount currency }
        }
      }
      total {
        gross { amount currency }
      }
    }
    errors { field message }
  }
}
```

---

# QUICK COPY-PASTE REFERENCE

## IDs You'll Need to Replace During Demo:

| When | Replace | With |
|------|---------|------|
| After 4.1 | `CHECKOUT_ID` | The `id` returned from checkoutCreate |
| After 4.2 | `SHIPPING_METHOD_ID` | The shipping method `id` from response |
| After 6.1 | `DRAFT_ORDER_ID` | The `id` returned from draftOrderCreate |

---

# DEMO FLOW CHECKLIST

1. [ ] **Show Products** → Run 1.1, mention multi-channel pricing
2. [ ] **Show Company Hierarchy** → Run 2.1, 2.2, 2.3 - show parent-child
3. [ ] **Show Customer-Company Link** → Run 3.1
4. [ ] **Checkout Flow** → Run 4.1 → 4.2 → 4.3 → 4.4 → 4.5
5. [ ] **Draft Order (Impersonation)** → Run 6.1 → 6.2
6. [ ] **Show in Dashboard** → Content → Models → Company hierarchy

**Good luck with the recording!**
