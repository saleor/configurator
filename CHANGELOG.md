# saleor-configurator

## 1.1.0

### Minor Changes

- 9ef53d2: Add CI/CD integration with GitHub Actions support

  - CLI flags: `--json`, `--githubComment`, `--plan`, `--failOnDelete`, `--failOnBreaking`
  - GitHub Action for automated workflows
  - Workflow templates for PR preview, deploy, and drift detection

- 7b7c776: Add Claude Code rules, hooks, and structured development workflows

  - Move CLAUDE.md to .claude/ for better organization
  - Add contextual rules that auto-load based on file patterns
  - Add skill evaluation hook for reliable skill activation
  - Add speckit commands for structured feature planning
  - Include demo configurations and templates

### Patch Changes

- ba73c08: Fix bulk product operations not wrapping descriptions as EditorJS JSON

  - Extract `wrapDescriptionAsEditorJS` method to consolidate description handling
  - Fix `bootstrapProductsBulk` create path missing EditorJS wrapping
  - Fix `bootstrapProductsBulk` update path missing EditorJS wrapping
  - Add JSON.parse validation to catch invalid JSON-like strings (e.g., "{Contact us}")
  - Log warning when description looks like JSON but fails to parse
  - Add comprehensive tests for edge cases (empty, whitespace, invalid JSON)

- 46da767: Fix model update failing with "attributeIds" required error

  - Include attributes directly in pageUpdate mutation instead of using separate pageAttributeAssign call
  - Resolves deployment failures when updating models with attribute values

- 97bcf71: Optimize Claude Code skills and add Serena memories for AI-assisted development

  - Add new `adding-entity-types` skill with complete E2E workflow documentation
  - Update all 9 existing skills with improved descriptions and cross-references
  - Add project-specific Serena memories (architecture, patterns, testing)
  - Update Serena workflow tips with Configurator-specific examples

## 1.0.0

### Major Changes

- 057c56a: **Bulk Mutations: 95% Faster Deployments**

  Replaced sequential individual GraphQL mutations with bulk operations to eliminate N+1 query problem. Deployments now complete in 18 seconds instead of 5.7 minutes.

  **Breaking Changes**
  None. All changes are backward compatible.

  **What Changed**

  - **Products**: Use `productBulkCreate` mutation (30 calls → 1 call)
  - **Attributes**: Use `attributeBulkCreate` mutation (50+ calls → 1 call)
  - **Variants**: Use `productVariantBulkCreate` mutation (60+ calls → 1 call)
  - **New utility**: `processInChunks()` for batch processing with configurable delays
  - **Applied chunking**: Product Types, Collections, Warehouses (10 items/batch, 500ms delays)

  **Performance Impact**

  ```
  API Calls:       170+ → 18      (90% reduction)
  Deployment Time: 5.7min → 18sec (95% faster)
  Rate Limit 429s: 50+ → 0        (eliminated)
  Success Rate:    60% → 100%
  ```

  **Bug Fixes**

  - Fixed pagination limit: Changed from 250 to 100 (Saleor max)
  - Fixed attribute resolver method calls
  - Fixed duplicate product references in variant creation

  **For Developers**

  No action required. Existing deployment configurations work as-is. Large deployments (30+ products) will now complete reliably without rate limiting errors.

  See `docs/adr/001-bulk-mutations-optimization.md` for technical details.

### Patch Changes

- c903953: **Bug Fixes for Bulk Mutations Optimization**

  Fixed critical issues discovered during bulk mutations testing:

  - **CXE-1108**: REFERENCE attributes now include `entityType` during introspection. Added validation that throws clear errors when REFERENCE attributes are missing required entityType.
  - **CXE-1194**: Fixed variant creation failing silently. `productVariantBulkCreate` now receives `product: ID!` at mutation level.
  - **CXE-1195**: Added `isAvailableForPurchase` and `availableForPurchaseAt` to product channel listing introspection.
  - **CXE-1196**: Fixed menu URL validation errors. URLs are now properly coerced to strings.
  - **CXE-1197**: Fixed SKU defaulting to variant ID. Empty SKUs now remain empty.
  - **GraphQL Fix**: Removed invalid `path` field from bulk mutation error queries.
  - **Channel Fix**: Reordered operations to update product channel listings before creating variants.

## 0.15.0

### Minor Changes

- 0d2e02d: ### Product media idempotency

  - Persist the original `externalUrl` in Saleor metadata during deploys so repeated runs stop diffing on Saleor-generated thumbnails.
  - Rehydrate that metadata when diffing and bootstrapping, letting the CLI compare against the real source URL.
  - Add `config.yml` support for media arrays round-tripped from Saleor.

  ### Resilience and pagination

  - Harden the product pagination query to mirror the main config selection and validated its shape with a unit test to prevent future regressions.
  - Slow down pagination/choice fetches to avoid Saleor rate limiting.

  ### Using external media

  Add `media` entries under a product to declare external assets:

  ```yaml
  products:
    - name: "New York City Museum"
      slug: "new-york-city-museum"
      # … other fields …
      media:
        - externalUrl: "https://upload.wikimedia.org/wikipedia/commons/9/94/Ashmolean.jpg"
          alt: "Museum exterior"
  ```

  The configurator now keeps this URL consistent across deploys even when Saleor transforms it into a thumbnail.

### Patch Changes

- a35aae8: Fix menu items not linking to categories when created via configurator.

  Menu items specified with category slugs (e.g., `category: "photobooks"`) now properly resolve to category IDs and link correctly in Saleor. Previously, the MenuService was missing required dependencies (CategoryService, CollectionService, ModelService), causing category resolution to be skipped and resulting in `category: null` in the API response.

  This fix ensures menu structures work correctly in storefronts by injecting the necessary services during MenuService initialization.

- ede44b6: Fixed the bug when product media properties didn't surface in the schema & were ignored while parsing the config.

## 0.14.0

### Minor Changes

- 72e807c: **Complete Product Management Support**

  Added full product management capabilities to the Saleor Configurator. You can now manage your entire product catalog through YAML configuration with complete round-trip integrity.

  **Key Features:**

  - Product lifecycle management with variants through YAML configuration
  - Multi-channel pricing and availability configuration for product variants
  - Support for all attribute types (plain text, dropdown, reference) with validation
  - SKU-based idempotency for reliable product variant updates
  - Detailed diff detection showing exact changes to be applied
  - Slug-based product identification for consistent cross-environment behavior

  **Workflow Integration:**

  - `introspect`: Download complete product catalog to YAML files
  - `diff`: Preview exact product changes before deployment
  - `push`: Deploy configurations with automatic create/update detection

  **Example Configuration:**

  ```yaml
  products:
    - name: "The Clean Coder"
      slug: "clean-coder"
      productType: "Book"
      category: "programming"
      variants:
        - name: "Hardcover"
          sku: "CLEAN-CODER-HC"
          price: 39.99
        - name: "Paperback"
          sku: "CLEAN-CODER-PB"
          price: 29.99
      channelListings:
        - channel: "default"
          isPublished: true
          availableForPurchase: "2024-01-01"
  ```

  This completes the "commerce as code" workflow for product management alongside existing support for channels, categories, and product types.

- d1ec7fd: This release focuses on stability, clarity and scale across the whole flow (introspect → diff → deploy). It removes “nothing changed” updates, prevents product‑creation errors, makes previews more useful, and handles large catalogs reliably.

  ## New

  - Safer product creation: the configurator now ensures required attribute values exist before creating products. This prevents occasional product‑creation failures when many products use the same new value.
  - Richer create previews: product Creates now show product type, category, key attributes, and per‑variant channel prices.

  ## Improved

  - Cleaner diffs: product descriptions are compared by visible text only, so diffs show meaningful content changes rather than raw JSON noise.
  - Duplicate protection: if duplicate slugs/names are detected, deploy/diff is blocked with a clear, styled message and guidance on what to fix.

  ## Fixed

  - Phantom updates removed: channel publish dates are normalized so format‑only differences no longer show as updates.
  - Repeated “Create” suggestions eliminated: remote introspection now retrieves all products, not just the first page.

  ## Performance & Scale

  - Large catalogs deploy more predictably with fewer redundant lookups and complete remote introspection.

  ## Notes

  - No breaking changes.
  - If deploy is blocked by duplicates, make the slugs/names unique in config.yml and rerun.

## 0.13.0

### Minor Changes

- 8ea51cd: Added support for Collections, Menus, and Models entity types. These can now be managed through configuration files with full introspect, diff, and deploy functionality. The deployment pipeline was extended from 10 to 14 stages to accommodate the new entity types.

### Patch Changes

- 180e8a2: Update documentation for comprehensive bootstrap guidance

  - **README.md**: Enhanced configuration example showcasing all entity types (taxClasses, collections, models, menus, etc.), improved quickstart flow, and complete entity reference guide
  - **SCHEMA.md**: Added documentation for missing entities (taxClasses, collections, models, menus, modelTypes) with examples and field descriptions
  - **example.yml**: Added strategic comments, section organization, and educational patterns for better bootstrap experience
  - Removed outdated limitations and misleading information
  - Documentation now accurately reflects the tool's evolution into a comprehensive "commerce as code" platform

## 0.12.0

### Minor Changes

- 15b5bf9: Enhanced error handling with actionable recovery suggestions. Errors now display specific fix instructions and relevant CLI commands. Fixed page type reference attributes to require entityType field. Deployment failures show clear success/failure breakdown per entity.

## 0.11.0

### Minor Changes

- f5b85c7: Added support for warehouses and shipping zones configuration. You can now manage warehouse locations, shipping zones, and shipping methods as code, enabling multi-region fulfillment setups and complex shipping rules across your Saleor instances.
- 551c736: Introduce recipe system with 7 production-ready e-commerce templates

  Launch a new recipe system that enables developers to instantly bootstrap Saleor stores for specific business models. Each recipe provides a complete, production-ready configuration that can be deployed with a single command.

  Available recipes:

  - **Marketplace**: Multi-vendor platform with vendor management, commission tracking, and order splitting
  - **Fashion**: Apparel and accessories with size charts, color swatches, and seasonal collections
  - **B2B**: Wholesale operations with volume pricing, payment terms, and approval workflows
  - **Digital Products**: Software, ebooks, and subscriptions with automatic delivery and license management
  - **Multi-Region**: International commerce with multiple currencies, channels, and localized experiences
  - **Click & Collect**: Omnichannel retail with BOPIS, curbside pickup, and store integration
  - **Custom Shipping**: Advanced logistics with complex rules, multi-carrier support, and freight options

  Quick start: `npx @saleor/configurator init --recipe marketplace`

  Each recipe includes comprehensive documentation, customization guides, and industry best practices.

### Patch Changes

- 7bc0629: Added support for product channel listings and fixed entity identification issues

  - Products and variants can now be configured with channel-specific pricing and visibility settings
  - Fixed duplicate detection by using slugs as identifiers for categories, channels, and products instead of names
  - Enables multi-channel commerce with per-channel product availability and pricing

- 5d1cb70: Fixed channel creation for Balkan countries by adding missing currency codes to validation schema

  - Added support for BAM (Bosnia and Herzegovina Convertible Mark), HRK (Croatian Kuna), and RSD (Serbian Dinar)
  - Channels for Croatia, Slovenia, Bosnia and Herzegovina, and Serbia can now be created successfully
  - Issue was caused by overly restrictive currency validation that didn't match Saleor's actual capabilities

- ffb34d2: Fixed recursive subcategory support to handle unlimited hierarchy depths. Previously, introspection would flatten category hierarchies, and deployment only supported single-level nesting. Now categories maintain their full tree structure during introspection, deployment, and diff operations, enabling proper round-trip integrity for complex category hierarchies.

## 0.10.6

### Patch Changes

- 71b757d: Fixed npx installation failures by removing problematic postinstall script that required devDependencies. The postinstall script was trying to run tsx commands that aren't available when installing via npx/pnpm dlx, causing installation to fail. Generated files are now created during the build process and included in the published package.

## 0.10.5

### Patch Changes

- 0aa86bb: Added comprehensive schema documentation with automatic generation. The new SCHEMA.md file provides detailed documentation of all configuration fields, types, and validation rules, automatically generated from the Zod schema using native v4 JSON schema capabilities.
- 5bf86b0: Fixed category slug being skipped during creation

## 0.10.4

### Patch Changes

- ffa236e: Fixed npx compatibility for ESM CLI package. Added ESM wrapper to resolve execution issues when using `npx @saleor/configurator start` command, while maintaining full compatibility with `pnpm dlx` and direct execution.

## 0.10.3

### Patch Changes

- d425e55: Fixed the bin resolution in npx.

## 0.10.2

### Patch Changes

- fa07ca8: Fixed the issue when npm was trying to fetch schema post install.

## 0.10.1

### Patch Changes

- 52a6de4: Bundle CLI with `tsup` for improved reliability and performance.

## 0.10.0

### Minor Changes

- 129083f: Improved user onboarding with enhanced start command. First-time users now get a welcoming introduction explaining what Saleor Configurator is, followed by guided setup. Returning users see a clean action menu. Consolidated all first-time user logic into the start command, making introspect purely functional.

### Patch Changes

- f5b85c7: Fixed entity identification to use slugs instead of names for categories and channels. Entities with the same name but different slugs are now correctly handled as separate entities, resolving duplicate detection issues. Also improved validation method naming from `validateUniqueNames` to `validateUniqueIdentifiers` for clarity.

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
