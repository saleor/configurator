# Feature Specification: Global Attributes Section

**Feature Branch**: `003-global-attributes`
**Created**: 2026-02-03
**Status**: Ready for Planning
**Input**: User description: "Configurator Attribute Resolution Issue - Add global attributes section to resolve attribute reference errors during parallel chunk processing"

## Problem Statement

When deploying generated configs, the system produces errors like:
- `WARN No referenced attributes found: Publisher, Genre, Condition...`
- `ERROR Could not resolve attributes: ID: QXR0cmlidXRlOjgz...`

**Root Cause**: Attributes are referenced using `{ attribute: "Publisher" }` pattern but don't exist yet when references are resolved during parallel chunk processing:

1. Product types are processed in parallel chunks
2. Within a chunk, references like `{ attribute: "Publisher" }` are resolved
3. The attribute "Publisher" hasn't been created yet (defined inline in another product type in the same chunk)
4. Result: Reference resolution fails

The `deduplicateAttributes()` function converts repeated definitions to references, but Saleor cannot resolve them during chunked processing.

## Clarifications

### Session 2026-02-03

- Q: What does "backward compatibility" mean for this feature? → A: Hard Migration - Only support global format; existing inline YAML will fail validation with migration instructions.
- Q: How should the global attributes section handle PRODUCT_TYPE vs PAGE_TYPE distinction? → A: Separate arrays with user-friendly names: `productAttributes` for PRODUCT_TYPE and `contentAttributes` for PAGE_TYPE (matching Saleor Dashboard terminology "Product Attribute" / "Content Attribute").
- Q: How should attribute caching work during deployment? → A: Cache after creation - attributesStage caches created/updated attributes in memory, productTypesStage and modelTypesStage use this cache for reference resolution instead of querying Saleor API.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Deploy Configuration with Shared Product Attributes (Priority: P1)

As a store operator, I want to deploy a YAML configuration that defines product attributes shared across multiple product types so that all product types can reference the same attributes without deployment failures.

**Why this priority**: This is the core problem being solved. Without this, users cannot deploy configurations with shared attributes, which is the most common use case for product catalogs.

**Independent Test**: Can be fully tested by deploying a YAML config with a global `productAttributes` section and multiple product types referencing those attributes, and verifying all attributes are created before product type processing.

**Acceptance Scenarios**:

1. **Given** a YAML config with a global `productAttributes` section containing "Publisher", "Genre", "Condition", **When** the user runs `deploy`, **Then** all three attributes are created as PRODUCT_TYPE attributes before product types are processed.

2. **Given** multiple product types referencing the same attribute "Publisher", **When** the user runs `deploy`, **Then** all product types correctly reference the single shared attribute without duplication.

3. **Given** a YAML config with `productAttributes`, **When** the user runs `deploy`, **Then** global attributes are created first, then product types reference them via `{ attribute: "Name" }` pattern.

---

### User Story 2 - Deploy Configuration with Content Attributes for Models (Priority: P1)

As a store operator, I want to deploy content attributes for model types so that I can define attributes used by models/pages.

**Why this priority**: Content attributes (PAGE_TYPE in Saleor API) are needed for the Models feature. Same parallel processing problem exists.

**Independent Test**: Can be fully tested by deploying a YAML config with `contentAttributes` and model types referencing them.

**Acceptance Scenarios**:

1. **Given** a YAML config with `contentAttributes` containing "Author", "Scent Family", **When** the user runs `deploy`, **Then** all attributes are created as PAGE_TYPE attributes before model types are processed.

2. **Given** a model type referencing a content attribute, **When** the user runs `deploy`, **Then** the model type correctly references the shared content attribute.

---

### User Story 3 - Introspect Existing Attributes to Separate Sections (Priority: P1)

As a store operator, I want the `introspect` command to extract all attributes into separate `productAttributes` and `contentAttributes` sections so that the generated YAML is deployment-ready without manual restructuring.

**Why this priority**: Users generate YAML from existing Saleor instances. If `introspect` doesn't produce the correct structure, users cannot round-trip their configurations.

**Independent Test**: Can be fully tested by running `introspect` on a Saleor instance with both product and content attributes and verifying the output YAML contains both sections.

**Acceptance Scenarios**:

1. **Given** a Saleor instance with PRODUCT_TYPE attributes, **When** the user runs `introspect`, **Then** all product attributes appear in the `productAttributes` section.

2. **Given** a Saleor instance with PAGE_TYPE attributes, **When** the user runs `introspect`, **Then** all content attributes appear in the `contentAttributes` section.

3. **Given** a Saleor instance with dropdown attributes having values, **When** the user runs `introspect`, **Then** the attribute sections include all attribute values for dropdown types.

---

### User Story 4 - Validate Attribute References (Priority: P2)

As a store operator, I want clear validation errors when my YAML references non-existent attributes so that I can fix configuration issues before deployment.

**Why this priority**: Good error messages prevent frustration and reduce debugging time, but are secondary to core functionality.

**Independent Test**: Can be fully tested by creating a YAML config with an invalid attribute reference and verifying the validation error message.

**Acceptance Scenarios**:

1. **Given** a YAML config where a product type references `{ attribute: "NonExistent" }`, **When** the user runs `deploy`, **Then** a clear error message identifies the missing attribute and the product type that references it.

2. **Given** a YAML config with a typo in an attribute reference (e.g., "Publsher" instead of "Publisher"), **When** the user runs `deploy`, **Then** the error suggests the closest matching attribute name.

3. **Given** a product type referencing an attribute that exists in `contentAttributes` (wrong type), **When** the user runs `deploy`, **Then** the error explains the attribute exists but is a content attribute, not a product attribute.

---

### User Story 5 - Diff Shows Attribute Changes (Priority: P2)

As a store operator, I want the `diff` command to show attribute changes correctly so that I can review what will be created, updated, or deleted.

**Why this priority**: Diff visibility is important for operational confidence but is secondary to successful deployment.

**Independent Test**: Can be fully tested by modifying the global attributes sections in YAML and running `diff` to verify changes are displayed.

**Acceptance Scenarios**:

1. **Given** a YAML config with a new attribute in `productAttributes`, **When** the user runs `diff`, **Then** the attribute appears as an addition under "Product Attributes".

2. **Given** a YAML config where an attribute's `inputType` changed from PLAIN_TEXT to DROPDOWN, **When** the user runs `diff`, **Then** the change is clearly shown.

---

### User Story 6 - Migration from Inline to Global Format (Priority: P1)

As a store operator with existing YAML configs using inline attribute definitions, I want clear migration instructions when validation fails so that I can update my configs to the new global format.

**Why this priority**: Users have existing YAML files that won't work with the new format. Clear migration path prevents frustration.

**Independent Test**: Can be fully tested by running deploy on a YAML with inline attributes and verifying the error message includes migration instructions.

**Acceptance Scenarios**:

1. **Given** a YAML config with inline attribute definitions in productTypes, **When** the user runs `deploy`, **Then** validation fails with a clear error explaining the new global format requirement.

2. **Given** a validation failure due to inline attributes, **When** the user reads the error message, **Then** it includes specific instructions: "Run `introspect` to generate YAML in the correct format, or move attribute definitions to the `productAttributes` or `contentAttributes` sections."

---

### Edge Cases

- What happens when a YAML has inline attribute definitions in productTypes? **Answer**: Validation fails with migration instructions directing user to use `productAttributes` section.
- What happens when a global attribute has no references? **Answer**: The attribute is still created (orphan attributes are allowed).
- What happens when an attribute's values in the global section conflict with existing values in Saleor? **Answer**: New values are added; existing values are preserved unless explicitly removed.
- What happens during partial deployment failure? **Answer**: Attributes created before failure remain; the user can re-run deploy to complete.
- What happens when a product type references a content attribute (wrong type)? **Answer**: Validation error explaining the attribute exists but in the wrong section.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support separate top-level sections: `productAttributes` (for PRODUCT_TYPE) and `contentAttributes` (for PAGE_TYPE).
- **FR-002**: System MUST deploy all global attributes before processing any entity that references attributes (product types, model types, products, models).
- **FR-003**: System MUST allow product types to reference product attributes using the `{ attribute: "Name" }` pattern only (no inline definitions).
- **FR-004**: System MUST allow model types to reference content attributes using the `{ attribute: "Name" }` pattern only (no inline definitions).
- **FR-005**: System MUST validate that product type attribute references resolve to attributes in `productAttributes` section.
- **FR-006**: System MUST validate that model type attribute references resolve to attributes in `contentAttributes` section.
- **FR-007**: System MUST extract PRODUCT_TYPE attributes into `productAttributes` during `introspect`.
- **FR-008**: System MUST extract PAGE_TYPE attributes into `contentAttributes` during `introspect`.
- **FR-009**: System MUST preserve attribute values (for dropdown types) when introspecting.
- **FR-010**: System MUST display attribute changes in `diff` output, grouped by type.
- **FR-011**: System MUST deduplicate attributes by name during introspection.
- **FR-012**: System MUST reject inline attribute definitions in productTypes/modelTypes with clear migration instructions.
- **FR-013**: System MUST provide migration guidance in validation errors for legacy YAML formats.
- **FR-014**: System MUST cache created/updated attributes in memory during deployment for reference resolution (avoid redundant API calls).
- **FR-015**: System MUST use cliConsole patterns for all user-facing output (warn for warnings, error for errors, hint for suggestions, box for migration guidance).
- **FR-016**: Validation error messages MUST include actionable suggestions via error.getSuggestions() displayed using cliConsole.hint().

### Key Entities

- **ProductAttribute**: An attribute of type PRODUCT_TYPE with a name, inputType (PLAIN_TEXT, DROPDOWN, etc.), and optional values. Used by product types for product and variant attributes.
- **ContentAttribute**: An attribute of type PAGE_TYPE with a name, inputType, and optional values. Used by model types for model attributes. (Maps to Saleor's "Content Attribute" in Dashboard)
- **AttributeValue**: A value option for DROPDOWN-type attributes. Has a name and belongs to an Attribute.
- **ProductType**: References ProductAttributes via productAttributes and variantAttributes using `{ attribute: "Name" }` reference pattern only.
- **ModelType** (aka PageType): References ContentAttributes via attributes using `{ attribute: "Name" }` reference pattern only. (Maps to Saleor's PageType in API, implemented as `PageTypeService` in codebase)

## YAML Schema Example

```yaml
# Product Attributes (PRODUCT_TYPE in Saleor API)
productAttributes:
  - name: Publisher
    inputType: PLAIN_TEXT
  - name: Genre
    inputType: DROPDOWN
    values:
      - name: Fantasy
      - name: Science Fiction
  - name: Condition
    inputType: DROPDOWN
    values:
      - name: MINT
      - name: VG+
      - name: VG

# Content Attributes (PAGE_TYPE in Saleor API)
contentAttributes:
  - name: Author
    inputType: PLAIN_TEXT
  - name: Scent Family
    inputType: DROPDOWN
    values:
      - name: Citrus
      - name: Woody
      - name: Floral

# Product types reference productAttributes
productTypes:
  - name: Board Game
    productAttributes:
      - attribute: Publisher
      - attribute: Genre
    variantAttributes:
      - attribute: Condition

# Model types reference contentAttributes
modelTypes:
  - name: Scent Profile
    attributes:
      - attribute: Scent Family
      - attribute: Author
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can deploy configurations with 100+ shared product attributes across 50+ product types without resolution errors.
- **SC-002**: Round-trip consistency: `introspect` → `deploy` → `introspect` produces identical YAML output.
- **SC-003**: Deployment of shared attributes completes successfully on first attempt (no retry required due to reference ordering).
- **SC-004**: Users receive actionable error messages for invalid attribute references within 1 second of validation.
- **SC-005**: Users with legacy inline YAML receive clear migration instructions that enable successful migration within 5 minutes.
- **SC-006**: YAML schema is intuitive - users understand `productAttributes` vs `contentAttributes` without reading documentation.

## Assumptions

- Attributes in Saleor are uniquely identified by name within their type (PRODUCT_TYPE or PAGE_TYPE).
- The `{ attribute: "Name" }` reference syntax is the only supported format (inline definitions are deprecated).
- Attribute values for DROPDOWN types are merged (additive) rather than replaced during deployment.
- The deployment order is: channels → productAttributes → contentAttributes → product types → model types → products → models.
- Existing users can regenerate their YAML via `introspect` to migrate to the new format.
- The terminology "Content Attribute" aligns with Saleor Dashboard UI and is preferred over "Page Attribute" for DX.
- Attribute cache is populated during attributesStage and passed to subsequent stages for reference resolution (avoids redundant API queries).
