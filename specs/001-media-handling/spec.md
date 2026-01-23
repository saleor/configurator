# Feature Specification: Media Handling for Cross-Environment Product Sync

**Feature Branch**: `001-media-handling`
**Created**: 2026-01-16
**Status**: Draft
**Linear Issue**: [CXE-1243](https://linear.app/saleor/issue/CXE-1243/support-media-handling-when-syncing-product-data-between-environments)
**GitHub Issue**: [#137](https://github.com/saleor/configurator/issues/137)

## Clarifications

### Session 2026-01-16

- Q: What is the media handling strategy scope? → A: Phased approach - `--skip-media` as Phase 1, with future phases (URL transformation, media sync) documented in roadmap
- Q: Which commands should support skip-media? → A: Deploy + Diff commands (introspect still captures all media)
- Q: Should skip-media be opt-in or opt-out? → A: Opt-in (explicit `--skip-media` flag required; default behavior processes media normally)
- Q: Should skip-media have per-entity-type granularity? → A: No, uniform behavior across all entity types (products, categories, collections)
- Q: Should CLI warn about cross-environment media URLs? → A: Yes, show non-blocking warning when cross-env media detected (deploy proceeds)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Skip Media During Deployment (Priority: P1)

As a developer syncing product configurations between environments, I want to skip media handling entirely during deployment so that I can sync product data without media URLs causing failures or pointing to wrong environments.

**Why this priority**: This is the most critical need - users are currently blocked from syncing product data when media is involved. A skip option provides an immediate workaround that unblocks all users.

**Independent Test**: Can be fully tested by running `configurator deploy --skip-media` with a config containing product media URLs and verifying that media fields are ignored while all other product data syncs correctly.

**Acceptance Scenarios**:

1. **Given** a config.yml with product media URLs from staging environment, **When** I run deploy with skip-media option to production, **Then** product data syncs successfully and media fields are not modified in target environment
2. **Given** a config.yml with product media URLs, **When** I run deploy with skip-media option, **Then** the CLI displays a clear message indicating media handling was skipped
3. **Given** I run deploy with skip-media option twice, **When** comparing results, **Then** behavior is idempotent (second run produces same result with no changes reported)
4. **Given** a config.yml with media differences from target environment, **When** I run `diff --skip-media`, **Then** the diff output excludes media field differences, showing only non-media changes

---

### User Story 2 - Preserve Existing Media on Target (Priority: P2)

As a developer deploying to an environment that already has product media configured, I want the deploy to preserve existing media on the target rather than overwriting with source URLs, so that I don't accidentally break media references in production.

**Why this priority**: This protects users from accidentally corrupting production media. It's a safety-by-default behavior that prevents data loss.

**Independent Test**: Can be tested by deploying a product config to an environment where the product already exists with different media, and verifying the target's media remains unchanged.

**Acceptance Scenarios**:

1. **Given** a product exists in target environment with media URLs, **When** I deploy product config from a different environment with skip-media option, **Then** the target product's media URLs remain unchanged
2. **Given** a new product in config.yml with media URLs, **When** I deploy with skip-media option to an environment where product doesn't exist, **Then** the product is created without media (media fields empty or omitted)

---

### User Story 3 - Clear Media Handling Feedback (Priority: P3)

As a developer running deployments, I want clear feedback about how media was handled during the operation, so that I understand what happened and can take manual action if needed.

**Why this priority**: Transparency helps users understand the system's behavior and make informed decisions about manual media management.

**Independent Test**: Can be tested by running deploy with media-containing configs and verifying the output includes media handling information.

**Acceptance Scenarios**:

1. **Given** a config with N products containing media, **When** I run deploy with skip-media option, **Then** the CLI output shows a summary like "Skipped media for N products"
2. **Given** a deployment that skips media, **When** the operation completes, **Then** the CLI summary clearly indicates media was skipped

---

### Edge Cases

- What happens when config.yml contains only media changes (no other product data changes)?
  - With skip-media: Deploy reports "no changes" since media is the only difference
- What happens when a product's media URL is malformed or inaccessible in the source config?
  - With skip-media: Irrelevant since media is not processed
- How does system handle products with multiple media items (galleries)?
  - Same behavior applies: all media fields are skipped consistently
- What happens when media fields are explicitly set to empty/null in config?
  - With skip-media: Empty/null values are also skipped, preserving target's existing media
- What happens when deploying without `--skip-media` and media URLs point to a different domain?
  - System shows a non-blocking warning (e.g., "Warning: Media URLs from staging.example.com detected. Consider using --skip-media for cross-environment deployments.") but proceeds with the deploy

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `--skip-media` flag for the `deploy` and `diff` commands that prevents any media-related fields from being processed
- **FR-002**: System MUST skip all product media fields when skip-media option is enabled, including: main image, gallery images, video URLs, and any other media references
- **FR-003**: System MUST preserve existing media on target environment when skip-media is enabled (no modifications to media fields on existing entities)
- **FR-004**: System MUST create products without media when skip-media is enabled and the product doesn't exist in target environment
- **FR-005**: System MUST display clear console output indicating media handling was skipped, including count of affected entities
- **FR-006**: System MUST maintain idempotent behavior when skip-media is used (repeated deployments produce consistent results)
- **FR-007**: System MUST support skip-media option via CLI flag (`--skip-media`). Config file form (persistent configuration) is deferred to a future enhancement.
- **FR-008**: System MUST apply skip-media consistently across all entity types that contain media references (products, categories, collections, etc.)
- **FR-009**: System MUST display a non-blocking warning when deploying without `--skip-media` and media URLs are detected that point to a different domain than the target environment (cross-environment media warning)

### Key Entities

- **Product Media**: Images, thumbnails, and gallery items associated with products. Currently stored as URLs pointing to environment-specific storage.
- **Category Media**: Background images and icons for categories.
- **Collection Media**: Background images for collections.
- **Media Configuration**: The skip-media setting that controls whether media fields are processed during deployment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully deploy product configurations between environments without media-related failures 100% of the time when using skip-media option
- **SC-002**: Deployment with skip-media completes with the same performance characteristics as deployment without media (no significant overhead)
- **SC-003**: Re-running deployment with skip-media produces identical results (zero diff on second run)
- **SC-004**: Users can identify from CLI output alone how many entities had media skipped during deployment
- **SC-005**: No media URLs from source environment appear in target environment when skip-media is used

## Assumptions

- Users managing media separately is an acceptable workflow (manual upload or separate media sync tool)
- The skip-media option applies uniformly to all media types (no granular control needed initially)
- Media fields in Saleor are well-defined and can be identified programmatically for filtering
- Performance impact of filtering media fields is negligible

## Scope & Roadmap

**This specification covers Phase 1 only.**

| Phase | Strategy | Description | Status |
|-------|----------|-------------|--------|
| 1 | Skip Media | `--skip-media` flag to ignore all media fields during sync | **This spec** |
| 2 | URL Transformation | Rewrite media URLs to target environment automatically | Future |
| 3 | Media Sync | Download from source, upload to target environment | Future |

Future phases are out of scope for this implementation but documented here for context and user expectation setting.
