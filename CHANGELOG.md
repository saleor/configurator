# saleor-configurator

## 0.3.0

### Minor Changes

- 6cb96d2: Add `diff` command

  Introduces a comprehensive `diff` command that compares local YAML configuration with remote Saleor instance state, enabling users to preview changes before applying them. This release also includes significant CLI/DX improvements across all commands.

  ## Key Features

  - **Configuration Diff**: Compare local YAML config with remote Saleor state without affecting data
  - **Multiple Output Formats**: Table, summary, and JSON formats for different use cases
  - **Entity-Level Analysis**: Detailed comparison of shops, channels, product types, categories, and attributes
  - **Enhanced CLI Experience**: Improved error handling, help system, and user-friendly messages
  - **Comprehensive Testing**: Full test coverage with reorganized test structure for better maintainability

  ## Usage

  ```bash
  pnpm diff                 # Show differences in table format
  pnpm diff --json          # Machine-readable JSON output
  pnpm diff --config custom.yml  # Compare specific config file
  ```

## 0.2.0

### Minor Changes

- 14fd641: Create vs Update Schema Design

  Introduces minimal create inputs vs full update inputs for "commerce as code" workflow where local configuration serves as the single source of truth.

- 70d934a: Product Creation Support

  Add product creation with variants, SKUs, automatic reference resolution, and idempotent operations

### Patch Changes

- c4ea2e9: Add versioning support with Changesets for tracking breaking changes and generating changelogs
