# saleor-configurator

## 0.5.0

### Minor Changes

- 110c477: Extend product type attributes to include variant attributes

  Now, instead of one `attributes` key (which pointed to product attributes), you can define both `productAttributes` and `variantAttributes` in the config.

- 110c477: Added referencing existing attributes by name

  Instead of providing the same attribute input several times, you can now declare it once and reference it by name in the product type input.

  **Example:**

  ```yaml
  productTypes:
    - name: Book
      productAttributes:
        - name: Author
          inputType: PLAIN_TEXT
        - name: Genre
          inputType: DROPDOWN
          values:
            - name: Fiction
            - name: Non-Fiction
            - name: Fantasy
    - name: E-Book
      productAttributes:
        - attribute: Author # Reference an existing attribute by slug
        - attribute: Genre # Reference an existing attribute by slug
        - name: File Format # New attribute
          inputType: DROPDOWN
          values:
            - name: PDF
            - name: EPUB
            - name: MOBI
  ```

### Patch Changes

- bc3be7b: Rename `interactive` command to `start`.

## 0.4.0

### Minor Changes

- e3c6287: ## Refactor Pull into Introspect with Enhanced Interactive CLI

  ### 🔄 Command Rename & Functionality

  - **Renamed** `pull` command to `introspect` for better semantic clarity
  - **Updated** package.json script from `pull` to `introspect`
  - **Enhanced** introspect command with intelligent diff-based workflow

  ### 🎯 Smart Introspection Features

  - **Automatic diff analysis** - Shows changes before overwriting local files
  - **Interactive confirmation prompts** - Asks for user consent when overwriting existing configurations
  - **Intelligent handling of invalid local configs** - Detects and offers to replace malformed configuration files
  - **Backup creation** - Automatically creates timestamped backups before overwriting
  - **Dry-run mode** (`--dry-run`) - Preview changes without making modifications
  - **Force mode** (`--force`) - Skip all confirmations for automated workflows

  ### 🎮 Interactive CLI Experience

  - **New interactive utilities** (`src/lib/utils/interactive.ts`):
    - `confirmPrompt()` - Interactive y/n confirmation with customizable defaults
    - `selectPrompt()` - Multiple choice selection interface
    - `displayDiffSummary()` - Formatted diff summary with change statistics
  - **Enhanced command help system** with detailed examples and environment variable documentation
  - **Improved error handling** with contextual suggestions and troubleshooting tips

  ### 🛠 CLI & Command Improvements

  - **Enhanced argument parsing** with better validation and error messages
  - **Comprehensive help text** showing required/optional arguments with descriptions
  - **Environment variable support** with clear documentation (SALEOR_URL, SALEOR_TOKEN, etc.)
  - **Improved URL validation** with automatic GraphQL endpoint correction
  - **Better error categorization** (network, auth, config, etc.) with specific guidance

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
