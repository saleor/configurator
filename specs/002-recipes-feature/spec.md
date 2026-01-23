# Feature Specification: Recipes Feature

**Feature Branch**: `002-recipes-feature`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "Add recipes feature with pre-built YAML configuration templates for common Saleor e-commerce patterns (multi-region, digital products, click-and-collect, custom shipping) and prepare for docs integration and Claude plugin"

## Clarifications

### Session 2026-01-19

- Q: How should recipes be accessed for npm-only users without the repo? → A: Bundled in npm package - Recipes shipped as YAML files inside the distributed package, accessed via CLI
- Q: How should AI agents discover recipes without repository context? → A: JSON manifest via CLI flag - `recipe list --json` outputs structured metadata for programmatic consumption
- Q: What documentation depth should each recipe include? → A: Rich + examples - Self-contained docs plus before/after examples showing typical modifications
- Q: Should recipes link to external Saleor documentation? → A: Single docsUrl - Each recipe links to its corresponding Saleor documentation page
- Q: What should the CLI command structure be? → A: Subcommand pattern - `configurator recipe list/show/apply` as nested commands under `recipe`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Available Recipes (Priority: P1)

A store administrator wants to quickly discover what pre-built configuration templates are available to accelerate their Saleor setup. They run a command to list all available recipes with brief descriptions.

**Why this priority**: This is the entry point to the recipes feature. Without the ability to discover recipes, users cannot use the feature at all. It provides immediate value by showing what's possible.

**Independent Test**: Can be fully tested by running the list command and verifying recipe names and descriptions display correctly. Delivers discovery value immediately.

**Acceptance Scenarios**:

1. **Given** the configurator is installed, **When** user runs the recipe list command, **Then** all available recipes are displayed with their names, brief descriptions, and categories
2. **Given** the configurator is installed, **When** user runs the recipe list command with a category filter, **Then** only recipes matching that category are displayed
3. **Given** no recipes exist in the recipes directory, **When** user runs the recipe list command, **Then** a helpful message indicates no recipes are available

---

### User Story 2 - Preview Recipe Configuration (Priority: P1)

A store administrator wants to understand what a recipe will configure before applying it. They preview a specific recipe to see the entities it will create or modify.

**Why this priority**: Users need to understand what changes a recipe will make before committing. This builds trust and prevents accidental misconfiguration. Essential for safe adoption.

**Independent Test**: Can be fully tested by selecting a recipe and verifying the preview shows all entities with their configurations. Delivers transparency value independently.

**Acceptance Scenarios**:

1. **Given** a recipe exists, **When** user runs the preview command for that recipe, **Then** all entities to be created are displayed in a readable format
2. **Given** a recipe with channel configurations, **When** user previews the recipe, **Then** channel settings like currency, country, and business rules are clearly shown
3. **Given** an invalid recipe name, **When** user tries to preview it, **Then** a clear error message indicates the recipe was not found with suggestions for valid recipes

---

### User Story 3 - Apply Recipe to Saleor Instance (Priority: P1)

A store administrator wants to quickly set up a common e-commerce pattern by applying a recipe to their Saleor instance. They select a recipe and deploy it.

**Why this priority**: This is the core value proposition - turning hours of manual configuration into a single command. Without this, recipes are just documentation.

**Independent Test**: Can be fully tested by applying a recipe to a test Saleor instance and verifying all entities are created correctly. Delivers configuration automation value.

**Acceptance Scenarios**:

1. **Given** a valid recipe and Saleor credentials, **When** user applies the recipe, **Then** all entities defined in the recipe are created in the Saleor instance
2. **Given** a recipe that conflicts with existing configuration, **When** user applies it, **Then** the system shows a diff of changes and asks for confirmation before proceeding
3. **Given** a recipe application in progress, **When** an entity fails to create, **Then** the error is reported clearly with the entity name and reason, and partial progress is preserved
4. **Given** a recipe with dependencies between entities, **When** user applies it, **Then** entities are created in the correct order (e.g., attributes before product types that use them)

---

### User Story 4 - Multi-Region Recipe (Priority: P2)

A store administrator setting up a global business wants to quickly configure multiple channels for different regions (US, EU, UK) with appropriate currencies, countries, and localization settings.

**Why this priority**: Multi-region is one of the most common and complex Saleor configurations. It demonstrates significant value and covers many entity types.

**Independent Test**: Can be tested by applying the multi-region recipe and verifying channels, warehouses, and shipping zones are created for each region.

**Acceptance Scenarios**:

1. **Given** the multi-region recipe, **When** user applies it, **Then** channels are created for US (USD), EU (EUR), and UK (GBP) with appropriate settings
2. **Given** the multi-region recipe applied, **When** user inspects the configuration, **Then** each channel has correct currency, default country, and regional settings
3. **Given** the multi-region recipe, **When** user previews it, **Then** tax class configurations per region are clearly displayed

---

### User Story 5 - Digital Products Recipe (Priority: P2)

A store administrator selling digital goods (software licenses, e-books, courses) wants to quickly configure product types that don't require shipping and have appropriate fulfillment settings.

**Why this priority**: Digital products are a growing segment and require specific Saleor configuration that differs from physical products. High demand use case.

**Independent Test**: Can be tested by applying the recipe and verifying product types have shipping disabled and appropriate digital fulfillment settings.

**Acceptance Scenarios**:

1. **Given** the digital products recipe, **When** user applies it, **Then** product types are created with `isShippingRequired: false`
2. **Given** the digital products recipe applied, **When** user creates a product using that type in Saleor, **Then** Saleor's checkout skips shipping address and method selection (expected Saleor behavior)
3. **Given** the digital products recipe, **When** previewed, **Then** it shows digital-specific attributes like download limits and URL validity days

---

### User Story 6 - Click and Collect Recipe (Priority: P2)

A store administrator with physical retail locations wants to enable customers to order online and pick up in store. They apply a recipe that configures warehouses as pickup points.

**Why this priority**: Click and collect is a key omnichannel capability. The configuration involves multiple entity types working together.

**Independent Test**: Can be tested by applying the recipe and verifying warehouse pickup settings are configured correctly.

**Acceptance Scenarios**:

1. **Given** the click-and-collect recipe, **When** user applies it, **Then** example warehouse(s) are created with pickup enabled
2. **Given** the recipe applied, **When** user views Saleor storefront checkout, **Then** collection points appear as delivery options (expected Saleor behavior)
3. **Given** the recipe, **When** previewed, **Then** it shows warehouse configuration with pickup zone settings

---

### User Story 7 - Custom Shipping Recipe (Priority: P3)

A store administrator wants to set up shipping zones with specific methods and rates for their business model. They apply a recipe that creates a foundational shipping configuration.

**Why this priority**: While important, shipping configuration is often highly customized. A template provides a starting point but requires more modification than other recipes.

**Independent Test**: Can be tested by applying the recipe and verifying shipping zones and methods are created.

**Acceptance Scenarios**:

1. **Given** the custom shipping recipe, **When** user applies it, **Then** shipping zones are created with example methods and rate structures
2. **Given** the recipe applied, **When** user inspects shipping configuration, **Then** zones cover common geographic regions with appropriate methods

---

### User Story 8 - Customize Recipe Before Applying (Priority: P3)

An advanced user wants to modify a recipe before applying it. They export a recipe to a local file, make changes, and then apply the customized version.

**Why this priority**: Power users need flexibility. This enables recipes as starting points rather than fixed templates.

**Independent Test**: Can be tested by exporting a recipe, modifying it, and applying the modified version successfully.

**Acceptance Scenarios**:

1. **Given** a recipe exists, **When** user exports it to a local file, **Then** a valid YAML file is created that can be edited
2. **Given** a modified recipe file, **When** user applies it with the file path, **Then** the customizations are reflected in the deployed configuration

---

### Edge Cases

- What happens when a recipe references entities that already exist in the target Saleor instance? (System shows diff and requires confirmation)
- How does the system handle applying the same recipe twice? (Idempotent - no changes on second application)
- What happens when a recipe is applied to an incompatible Saleor version? (Validation error with clear message)
- How are recipe dependency chains handled? (Entities applied in dependency order within a single recipe)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST bundle pre-built YAML recipe templates inside the npm package distribution, accessible via CLI commands without requiring repository access
- **FR-002**: System MUST provide `configurator recipe list` command to list all available recipes with name, description, and category
- **FR-003**: System MUST provide `configurator recipe show <name>` command to preview a recipe's configuration without applying it
- **FR-004**: System MUST provide `configurator recipe apply <name>` command to apply a recipe to a Saleor instance using existing deploy infrastructure
- **FR-005**: Recipes MUST support all entity types currently handled by configurator (channels, warehouses, shipping zones, tax classes, attributes, product types, categories, etc.)
- **FR-006**: System MUST validate recipe YAML files against the existing configuration schema
- **FR-007**: System MUST handle conflicts when recipe entities overlap with existing configuration by showing a diff
- **FR-008**: System MUST apply recipe entities in dependency order (e.g., attributes before product types)
- **FR-009**: System MUST provide clear error messages when recipe application fails, including which entity failed and why
- **FR-010**: System MUST include at least 4 initial recipes: multi-region, digital-products, click-and-collect, and custom-shipping
- **FR-011**: System MUST allow applying recipes from local file paths as well as built-in recipes
- **FR-012**: System MUST support filtering recipes by category when listing
- **FR-013**: Recipe metadata MUST include name, description, category, Saleor version compatibility, docsUrl (link to Saleor documentation), use case explanation, prerequisites, entity summary, customization hints, and before/after modification examples
- **FR-014**: System MUST support `--json` flag on recipe commands (list, show) to output machine-readable structured data for AI agent and automation consumption
- **FR-015**: System MUST provide `configurator recipe export <name> [--output <path>]` command to export a built-in recipe to a local file for customization

### Key Entities

- **Recipe**: A named configuration template containing a subset of Saleor entities. Key attributes: name (unique identifier), description, category, version compatibility, entities (the actual configuration), use case explanation, prerequisites, customization hints, modification examples
- **Recipe Category**: Grouping for recipes (e.g., "multi-region", "digital", "fulfillment", "shipping"). Used for filtering and organization
- **Recipe Metadata**: Self-contained documentation about a recipe including name, description, category, version compatibility, use case, prerequisites, entity summary, customization hints, and before/after modification examples. Stored within the recipe YAML frontmatter or dedicated metadata section

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Recipe list command completes in <100ms (local manifest read, no network calls)
- **SC-002**: Recipe show command renders full preview in <200ms (local file read, no network calls)
- **SC-003**: Users can apply a recipe and have all entities created successfully on first attempt (assuming no conflicts)
- **SC-004**: Recipe applications with no pre-existing conflicting entities complete without user intervention
- **SC-005**: Recipe application for the most complex recipe (multi-region) creates all entities correctly in a single command
- **SC-006**: Each recipe includes: description, use case, prerequisites, customization hints, and before/after examples
- **SC-007**: Custom recipes created by exporting and modifying built-in recipes work identically to built-in recipes

## Assumptions

- Recipes use the same YAML format as the existing `config.yml` file (partial configurations)
- The existing `deploy` command infrastructure can be reused for applying recipes
- The existing `diff` command can show changes between recipe and current state
- Recipe files are bundled inside the npm package at build time (e.g., `dist/recipes/`) and resolved at runtime via package path resolution, ensuring npm-only users can access all built-in recipes without cloning the repository
- Users have appropriate Saleor API permissions to create all entity types in a recipe
- The 4 initial recipes cover the most common configuration patterns based on Saleor documentation
