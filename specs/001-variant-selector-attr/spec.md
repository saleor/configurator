# Feature Specification: Variant Selector Attribute Configuration

**Feature Branch**: `001-variant-selector-attr`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "Add variant selector attribute configuration to product types - allow users to specify which variant attributes should be used for variant selection in storefronts (e.g., Size, Color dropdowns)"

## Clarifications

### Session 2026-01-19

- Q: When introspecting variant attributes with `variantSelection: false`, how should the YAML output represent this? → A: Omit the property entirely (cleaner YAML, matches Saleor's default behavior)

## Overview

In Saleor, when a product has multiple variants (e.g., a T-shirt with different sizes and colors), the storefront needs to know which attributes should be displayed as variant selectors (dropdown/swatch pickers) to help customers choose their desired variant. This feature adds support for configuring the `variantSelection` flag on variant attributes within product types.

### Background from Saleor API

The Saleor GraphQL API supports the following for variant attribute assignments:

1. **`variantSelection: Boolean`** on `ProductAttributeAssignInput` - When assigning attributes to a product type, specifies if the attribute should be used for variant selection
2. **Supported input types for variant selection**: `dropdown`, `boolean`, `swatch`, `numeric`
3. **`productAttributeAssignmentUpdate` mutation** - Allows updating the `variantSelection` flag on existing attribute assignments
4. **`AssignedVariantAttribute` type** - Returns `variantSelection: Boolean!` indicating if the assigned attribute is allowed for variant selection

## User Scenarios & Testing

### User Story 1 - Configure Variant Selection Attributes (Priority: P1)

As a store administrator using Saleor Configurator, I want to specify which variant attributes on a product type should be used for variant selection, so that my storefront displays the correct variant pickers (e.g., Size dropdown, Color swatch).

**Why this priority**: This is the core functionality requested in the Linear issue. Without it, users cannot control which attributes appear as variant selectors in their storefronts, forcing them to manually configure this via the Saleor Dashboard or API.

**Independent Test**: Can be fully tested by creating a config.yml with a product type that has variant attributes marked for variant selection, deploying it, and verifying the attribute assignment has `variantSelection: true` in the Saleor instance.

**Acceptance Scenarios**:

1. **Given** a YAML config with a product type having variant attributes with `variantSelection: true`, **When** the user runs `deploy`, **Then** the attributes are assigned to the product type with variant selection enabled
2. **Given** an existing product type with variant attributes not marked for selection, **When** the user updates the config to add `variantSelection: true` and runs `deploy`, **Then** the attribute assignment is updated to enable variant selection
3. **Given** a variant attribute with an unsupported input type (e.g., `PLAIN_TEXT`), **When** the user sets `variantSelection: true` and runs `deploy`, **Then** the system displays a validation error explaining that only dropdown, boolean, swatch, and numeric types support variant selection

---

### User Story 2 - Introspect Variant Selection Configuration (Priority: P2)

As a store administrator, I want to run `introspect` and see which variant attributes are currently configured for variant selection, so that I can understand my current configuration before making changes.

**Why this priority**: Introspection is essential for understanding existing state and enables the diff functionality. Users need to see what's already configured to make informed changes.

**Independent Test**: Can be tested by manually configuring variant selection in Saleor Dashboard, then running `introspect` and verifying the output YAML includes the `variantSelection` property for the appropriate attributes.

**Acceptance Scenarios**:

1. **Given** a Saleor instance with product types having variant attributes configured for variant selection, **When** the user runs `introspect`, **Then** the output YAML includes `variantSelection: true` for those attributes
2. **Given** a Saleor instance with variant attributes NOT configured for variant selection, **When** the user runs `introspect`, **Then** the output YAML omits the `variantSelection` property entirely (matching Saleor's default of `false`)

---

### User Story 3 - Diff Variant Selection Changes (Priority: P2)

As a store administrator, I want to see in the `diff` output when variant selection configuration changes, so that I can review what will be modified before deploying.

**Why this priority**: Diff is a core safety feature that helps users understand the impact of their changes before applying them.

**Independent Test**: Can be tested by having a local config differ from remote in terms of variant selection, running `diff`, and verifying the output clearly shows the variant selection changes.

**Acceptance Scenarios**:

1. **Given** a local config with `variantSelection: true` and remote has `variantSelection: false`, **When** the user runs `diff`, **Then** the output shows the variant selection change for that attribute
2. **Given** a local config that adds a new variant attribute with `variantSelection: true`, **When** the user runs `diff`, **Then** the output shows both the attribute addition and its variant selection setting

---

### Edge Cases

- What happens when `variantSelection` is set on a product-level attribute (not variant attribute)? System MUST silently ignore the property, as variant selection only applies to variant attributes. No warning is needed since the behavior matches user intent (the property has no effect).
- What happens when the user removes `variantSelection` from an attribute? The system should update the assignment to disable variant selection.
- What happens when an attribute with unsupported input type has `variantSelection: true`? System must validate and reject with a clear error message before deployment.
- What happens with referenced attributes (by slug)? The system should be able to set variant selection when assigning referenced attributes.

### Edge Case: variantSelection on Product-Level Attributes

**Given** a YAML config with a product type where a product-level attribute (not variant attribute) has `variantSelection: true`, **When** the user runs `deploy`, **Then** the system ignores the `variantSelection` property and deploys the attribute without attempting to set variant selection (since variant selection only applies to variant attributes).

## Requirements

### Functional Requirements

- **FR-001**: System MUST support a `variantSelection` boolean property on variant attributes in the config schema
- **FR-002**: System MUST validate that `variantSelection: true` is only set on attributes with compatible input types (`DROPDOWN`, `BOOLEAN`, `SWATCH`, `NUMERIC`)
- **FR-003**: System MUST deploy variant attributes with the correct `variantSelection` flag using the `productAttributeAssign` mutation
- **FR-004**: System MUST support updating existing variant attribute assignments using `productAttributeAssignmentUpdate` mutation when `variantSelection` changes
- **FR-005**: System MUST introspect the `variantSelection` status from existing `AssignedVariantAttribute` data, outputting `variantSelection: true` only when enabled (omit property when `false`)
- **FR-006**: System MUST show variant selection changes in diff output when comparing local vs remote configurations
- **FR-007**: System MUST ignore or omit `variantSelection` property when present on product-level attributes (not variant attributes)
- **FR-008**: System MUST support `variantSelection` on both inline attributes and referenced attributes (by slug)

### Key Entities

- **ProductType**: Container for product and variant attributes; the entity where attribute assignments are configured
- **VariantAttribute**: An attribute assigned at the variant level, which can optionally be marked for variant selection
- **AttributeInput**: The schema type for defining attributes in config, which will gain the `variantSelection` property

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can configure variant selection attributes via YAML and have them correctly applied to Saleor within a single deploy operation
- **SC-002**: All four supported input types (`DROPDOWN`, `BOOLEAN`, `SWATCH`, `NUMERIC`) work correctly with variant selection
- **SC-003**: Introspect produces valid YAML that, when deployed unchanged, results in no diff (round-trip integrity)
- **SC-004**: Attempting to use variant selection with unsupported input types produces a clear, actionable error message before any mutations are attempted

## Assumptions

- The Saleor API version used supports the `productAttributeAssignmentUpdate` mutation (available since Saleor 3.1)
- The current GraphQL schema in the codebase already includes the `variantSelection` fields (confirmed via schema inspection)
- Default behavior when `variantSelection` is omitted will be `false` (matching Saleor's default)
