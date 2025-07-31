# saleor-configurator

## 0.9.0

### Minor Changes

- f9d464d: Improved error handling for deploy command with specific exit codes and actionable error messages. Deploy operations now provide clear feedback when errors occur, including network issues (exit code 3), authentication failures (exit code 2), and validation errors (exit code 4). Added --verbose flag for detailed error information useful for debugging.

### Patch Changes

- f5dd91e: Fix introspect command ignoring include/exclude flags

  The introspect command now properly respects `--include` and `--exclude` flags to selectively retrieve configuration sections. Previously, these flags were parsed but ignored, causing the entire configuration to be saved regardless of the specified filters. This fix enables focused configuration management workflows.

- 67322af: Fix inconsistent diff results between commands

  Resolved an issue where diff operations could produce inconsistent results when used across different commands. The DiffService is now properly shared through the service container as a singleton, ensuring consistent configuration comparison behavior throughout the application.

- b745504: Fix page type attribute comparison in diff command

  Page type attributes were being ignored during diff operations due to inverted filtering logic. The comparator was incorrectly removing valid attributes instead of keeping them. This fix ensures page type attribute changes are properly detected and can be deployed.

- f7c4c6b: Fix introspect command creating invalid attribute definitions

  The introspect command now properly generates attribute references for shared attributes. When an attribute is used across multiple product types or page types, it's automatically converted to reference syntax (e.g., `attribute: "Color"`) rather than duplicating the full definition. This prevents duplicate attribute errors during subsequent deployments.

- 38e7ca2: Fix category parent-child relationship detection in diff

  Category comparisons now properly detect changes in nested subcategory structures. The diff command will show parent context for subcategory changes (e.g., 'In "Laptops": Subcategory "Gaming Laptops" added'), making it clear where in the hierarchy changes occurred. Previously, only top-level category changes were detected.

- 1233c85: Fix deployment failures caused by duplicate entities in Saleor

  Deployments no longer fail when Saleor contains duplicate entities (e.g., multiple page types or product types with the same name). The system now deduplicates remote entities automatically while warning about duplicates found. Additionally, improved exact-match logic prevents creating new duplicates during deployment.

- 1f08510: Merge category introspection with attribute normalization

  Combined the category introspection feature (Bug #8) with the attribute reference normalization feature (Bug #4). The configuration service now properly maps categories from remote Saleor instances while also preventing duplicate attribute definition errors during deployment.

- 8bb671e: Fix channel isActive field not being tracked in diff comparison

  The diff command was not detecting changes to the `isActive` field on channels, causing deployment issues when trying to enable or disable channels. This field is now properly tracked and compared.

- 90032b8: Fix duplicate attribute error when redeploying configurations

  Previously, pushing a configuration that contained attributes already present in Saleor (from previous deployments) would fail with a duplicate attribute error. The system now correctly reuses existing attributes instead of attempting to recreate them, making redeployments more reliable.

## 0.8.0

### Minor Changes

- cd9183e: ## New Deploy Command

  ### Breaking Change

  - Renamed `push` to `deploy` for better clarity
  - Simplified flags: removed `--skip-diff` and `--force`, added `--ci` for automation

  ### What's New

  **🚀 Real-time Progress Tracking**
  See exactly what's happening during deployment with visual progress indicators and stage-based execution.

  **📊 Enhanced Diff Preview**
  Always see what will change before deployment with improved formatting and grouped changes by entity type.

  **🛡️ Safety First**

  - Mandatory diff preview prevents surprises
  - Two-tier confirmation (extra warning for deletions)
  - CI mode (`--ci`) for automated deployments

  **📈 Deployment Reports**
  Automatic JSON reports with timing, changes applied, and summary statistics. Use `--report-path` to customize location.

  **🎯 Better Error Messages**
  Context-aware guidance for common issues like network, authentication, or configuration errors.

  ### Usage

  ```bash
  # Interactive deployment
  pnpm dlx @saleor/configurator deploy --url https://store.saleor.cloud/graphql/ --token your-app-token

  # CI/CD deployment
  pnpm dlx @saleor/configurator deploy --url https://store.saleor.cloud/graphql/ --token your-app-token --ci

  # Custom report location
  pnpm dlx @saleor/configurator deploy --url https://store.saleor.cloud/graphql/ --token your-app-token --report-path ./deploy-report.json
  ```

  ### Migration

  - Change `push` → `deploy`
  - Remove `--skip-diff` (diff always shown)
  - Replace `--force` with `--ci`

## 0.7.0

### Minor Changes

- ea1a819: Add `isShippingRequired` field to product type

  Product types now support the `isShippingRequired` boolean field to control whether products of this type require shipping. This defaults to `false` (unshippable by default).

  **Example:**

  ```yaml
  productTypes:
    - name: Book
      isShippingRequired: true
    - name: E-Book
      isShippingRequired: false
  ```

- ea1a819: Improve attribute duplicate handling

  Enhanced attribute handling to prevent duplicate definitions and encourage the use of reference syntax:

  - Added `DuplicateAttributeDefinitionError` for better error messaging when attributes are defined multiple times
  - Check for existing attributes globally before creating new ones
  - Suggest using reference syntax (`attribute: "AttributeName"`) when attributes already exist elsewhere
  - Allow full attribute input once, but encourage references for reuse

  This prevents conflicts and promotes better configuration practices by encouraging attribute reuse through the reference syntax.

### Patch Changes

- 7bfe8d9: Fixed the issue where channelListings are required for a variant.
- eeb25d3: Fixed the issue where the reference attribute syntax didn't work for page types. From now on, you can reference existing attributes in page types the same way as in product types.
- ea1a819: Remove support for description field in products

  The description field has been removed from the product schema as it was not being used by the product service. This simplifies the product configuration and removes unused fields.

## 0.6.0

### Minor Changes

- a42da43: Fixed introspect command diff perspective to correctly show changes from remote to local configuration. Added selective filtering with --include/--exclude options, CI mode for automation, and multiple output formats (table, JSON, YAML). Enhanced user experience with actionable error messages, progress indicators, confirmation prompts with change summaries, and operation timing. Added --backup flag (defaults to true) and --verbose mode.

## 0.5.1

### Patch Changes

- 4b9a651: Improved error messages. Now, Configurator should provide helpful error messages when distinguishing different types of errors (schema validation, GraphQL, configuration logic etc.).
- da7641e: Fixed the error when schema validation didn't see `null` as a correct value for some of the shop settings.

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
