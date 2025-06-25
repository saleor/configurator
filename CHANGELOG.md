# saleor-configurator

## 0.2.0

### Minor Changes

- [#21](https://github.com/saleor/configurator/pull/21) [`14fd641`](https://github.com/saleor/configurator/commit/14fd64160f09ea726cfa73010a19c15c0dfe839d) Thanks [@peelar](https://github.com/peelar)! - # Implement create vs update input schema design

  Introduces a new schema design that distinguishes between minimal create inputs (relying on Saleor API defaults) and full update inputs (complete state after pull operations). This enables a "commerce as code" workflow where local configuration serves as the single source of truth.

  ## Key Changes

  - **Union Schema Types**: Implemented Zod union types with `.or()` method for flexible input validation
  - **Create vs Update Patterns**: Separate schemas for each entity type (Channel, Shop, ProductType, PageType, Category)
  - **Attribute Update Support**: Added comprehensive attribute update functionality with value comparison
  - **Service Layer Enhancement**: Updated service classes to handle both create and update operations intelligently
  - **Type Safety**: Full TypeScript support with discriminated unions and proper type inference

- [#16](https://github.com/saleor/configurator/pull/16) [`70d934a`](https://github.com/saleor/configurator/commit/70d934a927045ef2e4c756702d9f92bd249efe5d) Thanks [@peelar](https://github.com/peelar)! - Add product creation support

  - Add product creation with variants, SKUs, and weights
  - Support automatic product type and category reference resolution
  - Optimize parallel execution for channels
  - Enable idempotent operations

### Patch Changes

- [#15](https://github.com/saleor/configurator/pull/15) [`c4ea2e9`](https://github.com/saleor/configurator/commit/c4ea2e9d1dbfcd36986da88ad86120ad57b555e8) Thanks [@peelar](https://github.com/peelar)! - Add versioning support with Changesets for tracking breaking changes and generating changelogs
