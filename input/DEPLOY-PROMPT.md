# Codal B2B Demo Deployment

## Context

Codal has a **$250M opportunity** for Saleor Cloud. They've requested a recorded video demo of Saleor's B2B capabilities by **tomorrow EOD** for a Thursday customer meeting.

The demo needs to cover:
- Admin: Pricing, products/catalogs, parent-child company hierarchy (Ship-To/Bill-To), plugins (Vertex/ElasticSearch), promotions, impersonation, order placement on behalf of customers, roles/permissions
- Pricing engine capabilities
- UX: Customer switching, checkout flow, promotions, orders/invoices, CMS, PDP, PLP, approval workflow
- Developer: Custom checkout code, extensibility
- Optional: Delayed/scheduled shipments

## Files

- `demo-b2b-codal.yml` - Complete B2B config for Industrial Supply Company scenario
- `../DEMO-SCRIPT-CODAL.md` - Recording script covering all checklist items

## Deployment Instructions

### 1. Get Saleor Cloud Instance

You need a Saleor Cloud instance. Either:
- Use an existing demo instance
- Create a fresh one at https://cloud.saleor.io

### 2. Create App Token

1. Go to Dashboard > Configuration > Webhooks & Events > Apps
2. Create a new app or use existing
3. Generate a token with **all permissions**

### 3. Deploy the Config

```bash
cd /Users/mariogomes/git/lab/configurator

# Preview changes first
pnpm dlx @saleor/configurator diff \
  --url https://<instance>.saleor.cloud/graphql/ \
  --token <app-token> \
  --config input/demo-b2b-codal.yml

# Deploy
pnpm dlx @saleor/configurator deploy \
  --url https://<instance>.saleor.cloud/graphql/ \
  --token <app-token> \
  --config input/demo-b2b-codal.yml
```

### 4. Post-Deployment Setup

After deploying the config, manually set up in Dashboard:

1. **Staff Users** (Settings > Staff)
   - Create admin user with full permissions
   - Create sales rep user with Orders + Customers permissions only

2. **Test Customer** (Customers)
   - Create a B2B customer account
   - Add multiple shipping addresses (headquarters, branch offices)
   - Add multiple billing addresses

3. **Sample Orders** (Orders)
   - Create 2-3 draft orders for impersonation demo
   - Create 2-3 completed orders for order history demo

4. **Voucher** (Discounts > Vouchers)
   - Create a test voucher code like `B2B10` for 10% off
   - Set minimum order value to $100

5. **Connect Storefront**
   - Deploy saleor-storefront or use existing
   - Point to this instance

## What the Config Creates

| Entity | Count | Description |
|--------|-------|-------------|
| Channels | 3 | US B2B, Canada B2B, Mexico B2B |
| Warehouses | 4 | US East, US West, Canada, Mexico DCs |
| Shipping Zones | 5 | Regional + national fulfillment |
| Tax Classes | 3 | Standard, Exempt, Reduced |
| Product Types | 5 | Equipment, Parts, Safety, Supplies, Digital |
| Categories | 15+ | Hierarchical catalog structure |
| Collections | 5 | Merchandising collections |
| Page Types | 3 | CMS content structure |
| Menus | 3 | Navigation structure |
| Products | 4 | Sample products with variants |

## Recording the Demo

See `../DEMO-SCRIPT-CODAL.md` for the complete recording script.

**Quick tips:**
- Use Loom for recording
- Target 15-20 minutes
- Follow the script sections in order
- Don't worry about polish - they said unpolished is fine
- Make sure to show B2B-specific features: bulk quantities, channel pricing, draft orders for impersonation

## Checklist Mapping

| Codal Requirement | How We Demo It |
|-------------------|----------------|
| Management of pricing | Channel-specific pricing in product variants |
| Products and catalogs | Product types, categories, collections |
| Parent/child hierarchy | Channels + customer multiple addresses |
| Plugins (Vertex/ES) | Apps section + TAX_APP configuration |
| Promotions | Vouchers + collections |
| Impersonation | Draft orders "Create Order" |
| Orders on behalf | Draft order workflow |
| Roles/permissions | Staff permission groups |
| Approval workflow | Draft orders requiring manager action |
| Checkout customization | GraphQL API demo |
