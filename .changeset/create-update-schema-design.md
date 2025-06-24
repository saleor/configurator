---
"saleor-configurator": minor
---

# Implement create vs update input schema design

Introduces a new schema design that distinguishes between minimal create inputs (relying on Saleor API defaults) and full update inputs (complete state after pull operations). This enables a "commerce as code" workflow where local configuration serves as the single source of truth.

## Key Changes

- **Union Schema Types**: Implemented Zod union types with `.or()` method for flexible input validation
- **Create vs Update Patterns**: Separate schemas for each entity type (Channel, Shop, ProductType, PageType, Category)
- **Attribute Update Support**: Added comprehensive attribute update functionality with value comparison
- **Service Layer Enhancement**: Updated service classes to handle both create and update operations intelligently
- **Type Safety**: Full TypeScript support with discriminated unions and proper type inference
