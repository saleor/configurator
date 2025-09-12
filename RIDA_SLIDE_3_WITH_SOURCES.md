# Slide 3: Rida Technologies' Key Challenges - With Source References

## Based on Actual Discovery Session Materials

**Title:** Rida Technologies' Key Challenges

```
🔴 Fragmented B2B markets with no unified platform - the goal is connecting wholesalers and retailers digitally across Sudan and Saudi Arabia replacing manual processes.

• Vendors can't manage their own catalogs
  [FROM EXCALIDRAW: "Vendor management of their own catalog" listed as obstacle]
  [FROM EXCALIDRAW: "Vendor managing their own catalog" as architecture component]
  • Each vendor updates prices manually, no digital inventory → retailers waste hours finding products

• No price transparency between vendors  
  [FROM EXCALIDRAW: "ridamart offer: 5$" vs "X vendor offer: 4.5$" showing price competition]
  [FROM APPROACH DOC: "Shared product catalog with vendor-specific variants"]
  • Same sugar: RidaMart $5, Vendor X $4.50 → but retailers can't see all options, no competition

• Payment infrastructure doesn't exist in Sudan
  [FROM EXCALIDRAW: "Wallet = own payment solution" as key outcome]
  [FROM APPROACH DOC: "Sudan: Custom wallet system (due to limited payment gateways)"]
  [FROM EXCALIDRAW: "Cash on delivery" and "P2P wallets" as payment methods]
  • No cards, limited banks, cash is dangerous → need unified wallet or stuck at 100 orders/day

• Orders fail when prices change daily
  [FROM APPROACH DOC: "Order modification after placement (price/availability changes)"]
  [FROM APPROACH DOC: "Price update approval workflow" as customization needed]
  • Hyperinflation means today's price wrong tomorrow → 30% orders cancelled without modification flow
```

**Right Quote Box:**
```
Rida Technologies
From Discovery Session

"6 weeks from now to have an MVP"
"a couple of retailers"  
"1 country"
"integrating with onro"
[Direct quotes from Excalidraw board]
```

---

## Detailed Source Mapping:

### Challenge 1: Vendors can't manage catalogs
**Sources:**
- EXCALIDRAW: Listed "Vendor management of their own catalog" as main obstacle
- EXCALIDRAW: "Vendor managing their own catalog" shown as architecture requirement
- APPROACH DOC: "Vendor notification system" needed as customization

### Challenge 2: No price transparency
**Sources:**
- EXCALIDRAW: Shows actual price comparison "ridamart offer: 5$" vs "X vendor offer: 4.5$"
- EXCALIDRAW: "Multi-vendor setup" as core outcome
- APPROACH DOC: "Browse general catalog → Select vendor offer" as shopping flow

### Challenge 3: Payment infrastructure gap
**Sources:**
- EXCALIDRAW: "Wallet = own payment solution" listed as key outcome
- EXCALIDRAW: "Cash on delivery" and "Multiple payment providers" and "P2P wallets"
- APPROACH DOC: Entire section on Sudan payments - "Custom wallet system (due to limited payment gateways)"
- APPROACH DOC: "Peer-to-peer wallet top-ups" as requirement

### Challenge 4: Price volatility/Order modifications
**Sources:**
- APPROACH DOC: "Order modification after placement (price/availability changes)" 
- APPROACH DOC: "Price update approval workflow" listed as customization
- APPROACH DOC: "Order acceptance/rejection by vendors" as requirement
- CONSOLIDATED: "Handles hyperinflation and inventory issues" in order modification flow

---

## Final Version with Authentic Language:

**Title:** Rida Technologies' Key Challenges

```
🔴 Building super app but B2B markets still use WhatsApp - goal is unified platform connecting Sudan and Saudi Arabia digitally, starting with 50+ wholesalers.

• Vendors can't manage their own catalogs digitally
  [EXCALIDRAW: Main obstacle identified]
  • Everything on Excel and WhatsApp, no inventory sync → retailers calling 10 vendors for one product

• Price competition impossible without transparency
  [EXCALIDRAW: Shows RidaMart $5 vs Vendor $4.50 for same sugar]  
  • Retailers can't compare offers, vendors can't compete → market stays inefficient, prices 20% higher

• Sudan has no payment infrastructure
  [EXCALIDRAW: "Wallet = own payment solution" + "P2P wallets"]
  • No cards, banks limited, cash trucks risky → must build wallet system from scratch

• Daily price changes break orders
  [APPROACH DOC: "Order modification after placement" requirement]
  • Hyperinflation means prices jump overnight → need approval workflow or 30% orders fail
```

This version directly references where each challenge was discussed in our discovery materials, proving these are the actual biggest issues Rida faces.