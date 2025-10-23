# Command Reference Guide

Complete reference for all Saleor Configurator commands, including syntax, options, examples, and common usage patterns.

## Environment Variables

**Test Environment (Always Available):**
```bash
export TEST_URL="https://store-rzalldyg.saleor.cloud/graphql/"
export TEST_TOKEN="YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs"

# Usage in commands
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN
```

**Production Environment:**
```bash
export SALEOR_URL="https://your-store.saleor.cloud/graphql/"
export SALEOR_TOKEN="your-production-token"

# Usage in commands
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN
```

## Core CLI Commands

### Interactive Commands

**Start Interactive Wizard:**
```bash
pnpm dev start                          # Interactive setup wizard
pnpm dev                               # Interactive CLI menu
```

### Introspect Commands

**Basic Introspection:**
```bash
# Download complete configuration
pnpm dev introspect --url=$URL --token=$TOKEN

# Download to custom file
pnpm dev introspect --url=$URL --token=$TOKEN --config=custom.yml

# Download specific entities only
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop,channels
pnpm dev introspect --url=$URL --token=$TOKEN --exclude=products,categories
```

**Common Introspect Patterns:**
```bash
# Quick shop settings check
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop

# Full entity structure (no products/variants)
pnpm dev introspect --url=$URL --token=$TOKEN --exclude=products

# Configuration structure only
pnpm dev introspect --url=$URL --token=$TOKEN --include=channels,productTypes,pageTypes
```

### Diff Commands

**Basic Diff:**
```bash
# Show all differences
pnpm dev diff --url=$URL --token=$TOKEN

# Dry run format (safe to run)
pnpm dev diff --url=$URL --token=$TOKEN --dry-run

# With custom config file
pnpm dev diff --url=$URL --token=$TOKEN --config=production.yml
```

**Selective Diff:**
```bash
# Specific entities only
pnpm dev diff --url=$URL --token=$TOKEN --include=collections,menus
pnpm dev diff --url=$URL --token=$TOKEN --exclude=products,categories

# Single entity type
pnpm dev diff --url=$URL --token=$TOKEN --include=shop
```

**Output Formats:**
```bash
# Table format (default)
pnpm dev diff --url=$URL --token=$TOKEN --format=table

# JSON output
pnpm dev diff --url=$URL --token=$TOKEN --format=json

# YAML output  
pnpm dev diff --url=$URL --token=$TOKEN --format=yaml
```

### Deploy Commands

**Basic Deployment:**
```bash
# Deploy with confirmation prompts
pnpm dev deploy --url=$URL --token=$TOKEN

# Deploy with custom config
pnpm dev deploy --url=$URL --token=$TOKEN --config=production.yml

# CI mode (no prompts, for automation)
pnpm dev deploy --url=$URL --token=$TOKEN --ci
```

**Selective Deployment:**
```bash
# Deploy specific entities
pnpm dev deploy --url=$URL --token=$TOKEN --include=collections,menus
pnpm dev deploy --url=$URL --token=$TOKEN --exclude=products,categories

# Deploy dependencies first, then dependents
pnpm dev deploy --url=$URL --token=$TOKEN --include=channels,productTypes
pnpm dev deploy --url=$URL --token=$TOKEN --include=products,collections
```

**Safe Deployment Options:**
```bash
# Dry run (preview changes without applying)
pnpm dev deploy --url=$URL --token=$TOKEN --dry-run

# With backup (creates backup before deployment)
pnpm dev deploy --url=$URL --token=$TOKEN --backup

# Verbose output
pnpm dev deploy --url=$URL --token=$TOKEN --verbose
```

**Performance Tuning:**
```bash
# Control concurrency for batch operations (default: 5)
pnpm dev deploy --url=$URL --token=$TOKEN --concurrency 10

# Process items one at a time (useful for debugging)
pnpm dev deploy --url=$URL --token=$TOKEN --concurrency 1

# Add delay between batches (in milliseconds)
pnpm dev deploy --url=$URL --token=$TOKEN --concurrency 5 --delay 1000

# Combine for rate-limited APIs
pnpm dev deploy --url=$URL --token=$TOKEN --concurrency 1 --delay 500
```

## Quality Assurance Commands

### MANDATORY PRE-PUSH CHECKLIST

⚠️ **CRITICAL**: NEVER push changes unless ALL of these pass in order:

```bash
# 1. Auto-fix all linting and formatting issues
pnpm check:fix

# 2. Verify TypeScript compilation  
pnpm build

# 3. Run all tests
pnpm test

# 4. Verify TypeScript with strict checking
npx tsc --noEmit

# 5. Final validation check
pnpm check:ci
```

**This checklist is MANDATORY and cannot be bypassed for any reason.**

### Individual Quality Checks

**Linting and Formatting:**
```bash
pnpm lint                              # Biome linting only
pnpm lint:fix                          # Auto-fix linting issues
pnpm format                            # Biome formatting only  
pnpm format:fix                        # Auto-fix formatting issues
pnpm check                             # Combined check without fixes
pnpm check:fix                         # Auto-fix all issues
pnpm check:ci                          # CI-level checks with error diagnostics
```

**Build and Compilation:**
```bash
pnpm build                             # TypeScript compilation with tsup
npx tsc --noEmit                       # TypeScript check without output
```

## Testing Commands

### Test Execution

**Basic Testing:**
```bash
pnpm test                              # All tests (watch mode in dev)
pnpm test:ci                           # CI mode (silent, run once)
CI=true pnpm test                      # Alternative CI mode
pnpm test --run                        # Run once (no watch)
```

**Selective Testing:**
```bash
# Test specific modules
pnpm test src/modules/collection/      # Collection module tests
pnpm test src/core/diff/               # Diff system tests
pnpm test src/commands/                # CLI command tests

# Test specific files
pnpm test src/modules/category/category-service.test.ts
pnpm test src/core/diff/service.test.ts

# Pattern-based testing
pnpm test --testNamePattern="validation"
pnpm test --testPathPattern="comparator"
```

**Test Environment Variables:**
```bash
# Timeout for longer tests
timeout 30s pnpm test --silent

# Debug mode testing
LOG_LEVEL=debug pnpm test src/modules/tax/

# CI environment testing  
CI=true pnpm test src/lib/utils/error-wrapper.test.ts
```

## Debug and Diagnostic Commands

### Debug Logging

**Enable Debug Mode:**
```bash
# Debug deployment process
LOG_LEVEL=debug pnpm dev deploy --url=$URL --token=$TOKEN

# Debug diff analysis
LOG_LEVEL=debug pnpm dev diff --url=$URL --token=$TOKEN

# Debug introspection
LOG_LEVEL=debug pnpm dev introspect --url=$URL --token=$TOKEN
```

### Health Check Commands

**System Health:**
```bash
# Complete system validation
pnpm check && pnpm build && pnpm test && npx tsc --noEmit

# API connectivity test
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN --dry-run
```

**GraphQL Diagnostics:**
```bash
# Permission test
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop

# Schema compatibility check
pnpm fetch-schema && pnpm build

# Debug GraphQL operations
LOG_LEVEL=debug pnpm dev diff --url=$URL --token=$TOKEN
```

**Entity-Specific Diagnostics:**
```bash
# Test specific entity operations
pnpm dev diff --url=$URL --token=$TOKEN --include=collections

# Test deployment for single entity
pnpm dev deploy --url=$URL --token=$TOKEN --include=shop --dry-run

# Check entity relationships
pnpm dev diff --url=$URL --token=$TOKEN --include=categories,products
```

### Troubleshooting Commands

**Connection Issues:**
```bash
# Test basic connectivity
curl -I $SALEOR_URL

# Minimal API test
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop --quiet
```

**Permission Issues:**
```bash
# Test read permissions
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop

# Test write permissions
echo "shop:" > minimal-config.yml
echo "  defaultMailSenderName: Test" >> minimal-config.yml
pnpm dev deploy --url=$URL --token=$TOKEN --config=minimal-config.yml --dry-run
```

**Configuration Issues:**
```bash
# Validate configuration syntax
pnpm dev deploy --url=$URL --token=$TOKEN --dry-run --quiet

# Check specific entity validation
pnpm dev deploy --url=$URL --token=$TOKEN --include=collections --dry-run
```

## Schema and Development Commands

### Schema Management

**Schema Operations:**
```bash
pnpm fetch-schema                      # Download Saleor GraphQL schema
pnpm generate-json-schema              # Generate JSON schema from Zod
pnpm generate-schema-docs               # Generate SCHEMA.md documentation
```

**GraphQL Tools:**
```bash
npx gql.tada generate                   # Generate GraphQL types
npx gql.tada check                      # Validate GraphQL operations
```

### Build and Release

**Development Build:**
```bash
pnpm build                             # TypeScript compilation
pnpm prepublishOnly                    # Build for publishing (runs build)
```

**Release Management:**
```bash
pnpm changeset                         # Create changeset for version management
pnpm version                           # Apply changesets and bump versions
```

## Git and Version Control

### Standard Git Workflow

**Basic Operations:**
```bash
git status                             # Check working directory status
git add .                              # Stage all changes
git commit -m "feat: description"      # Commit with conventional message
git push                               # Push to remote repository
```

**Branch Management:**
```bash
git checkout -b feature/new-feature    # Create and switch to feature branch
git checkout main                      # Switch to main branch
git pull                               # Pull latest changes
git push --follow-tags                 # Push with tags for releases
```

### Release Workflow

**Changeset Process:**
```bash
# 1. Create changeset
pnpm changeset

# 2. Stage and commit changeset
git add .changeset/
git commit -m "chore: add changeset for feature"

# 3. Push changes
git push

# 4. After merge, tags are automatically created and pushed
```

## Command Combinations and Workflows

### Complete Development Workflow

**New Feature Development:**
```bash
# 1. Start development
git checkout -b feature/new-entity
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN

# 2. Make changes to config.yml
# ... edit configuration ...

# 3. Test changes
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN --dry-run

# 4. Deploy and test
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN
pnpm dev deploy --url=$TEST_URL --token=$TEST_TOKEN  # Test idempotency

# 5. Quality checks before pushing
pnpm check:fix && pnpm build && pnpm test && npx tsc --noEmit && pnpm check:ci

# 6. Commit and push
git add .
git commit -m "feat: add new entity configuration"
git push
```

### Production Deployment Workflow

**Safe Production Deployment:**
```bash
# 1. Backup current config
cp config.yml config-backup-$(date +%Y%m%d).yml

# 2. Test deployment
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --dry-run

# 3. Deploy specific entities first (if large changes)
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --include=channels,productTypes

# 4. Deploy remaining entities
pnpm dev deploy --url=$SALEOR_URL --token=$SALEOR_TOKEN --exclude=channels,productTypes

# 5. Verify deployment
pnpm dev diff --url=$SALEOR_URL --token=$SALEOR_TOKEN
```

### Emergency Recovery Workflow

**Rollback Process:**
```bash
# 1. Assess current state
pnpm dev diff --url=$URL --token=$TOKEN

# 2. Restore from backup
cp config-backup-YYYYMMDD.yml config.yml

# 3. Deploy rollback
pnpm dev deploy --url=$URL --token=$TOKEN --ci

# 4. Verify recovery
pnpm dev diff --url=$URL --token=$TOKEN
```

## Error Handling and Recovery

### Common Error Scenarios

**Configuration Validation Errors:**
```bash
# Check validation issues
pnpm dev deploy --url=$URL --token=$TOKEN --dry-run --verbose

# Test specific entity
pnpm dev deploy --url=$URL --token=$TOKEN --include=problematic-entity --dry-run
```

**Network and API Errors:**
```bash
# Test connectivity
curl -I $SALEOR_URL
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop --timeout=30

# Retry with backoff
sleep 5  && pnpm dev deploy --url=$URL --token=$TOKEN || \
sleep 10 && pnpm dev deploy --url=$URL --token=$TOKEN || \
sleep 30 && pnpm dev deploy --url=$URL --token=$TOKEN
```

**Permission Errors:**
```bash
# Verify app permissions in Saleor Dashboard
pnpm dev introspect --url=$URL --token=$TOKEN --include=shop

# Test write permissions
pnpm dev deploy --url=$URL --token=$TOKEN --dry-run
```

---

**Related Documentation:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Comprehensive troubleshooting procedures
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - End-to-end testing procedures
- [ENTITY_REFERENCE.md](ENTITY_REFERENCE.md) - Entity identification and patterns
- [CLAUDE.md](CLAUDE.md) - Main navigation hub