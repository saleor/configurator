# E2E Tests - Business & User Experience Focused

This directory contains end-to-end tests that validate business functionality and user experience of the Saleor Configurator.

## Test Categories

### 🏢 Business Operations (`/tests/scenarios/`)

1. **Entity Operations** (`entity-operations.e2e.test.ts`)
   - CRUD operations for business entities (categories, products, channels)
   - Ensures configuration changes are correctly applied to Saleor
   - Validates data integrity and relationships

2. **Selective Operations** (`selective-operations.e2e.test.ts`)
   - Partial deployments using --include/--exclude flags
   - Critical for production where only specific changes should be applied
   - Ensures unchanged sections remain untouched

3. **Complex Scenarios** (`complex-scenarios.e2e.test.ts`)
   - Multi-channel e-commerce setups
   - Cross-regional configurations
   - Real-world business workflows

### 👤 User Experience (`/tests/smoke/`)

1. **Error Messages** (`error-messages.e2e.test.ts`)
   - Clear, actionable error messages for common issues
   - No technical jargon in user-facing errors
   - Helpful recovery suggestions

2. **Error Presentation** (`/tests/scenarios/error-presentation.e2e.test.ts`)
   - Authentication errors are clearly explained
   - Network issues provide troubleshooting steps
   - Validation errors use business terminology

### 🔄 Core Workflows (`/tests/smoke/`)

1. **Basic Flow** (`basic-flow.e2e.test.ts`)
   - Complete introspect → modify → deploy → verify cycle
   - Idempotency validation (deploying twice is safe)
   - Round-trip integrity

2. **Simple Tests** (`simple.e2e.test.ts`)
   - Quick smoke tests without Docker
   - Configuration validation
   - Command availability

### 🛠️ Command Features (`/tests/commands/`)

1. **Deploy Command** (`deploy-command.e2e.test.ts`)
   - Deployment safety features (--dry-run, --skip-diff)
   - Backup creation and rollback scenarios

2. **Introspect Command** (`introspect-command.e2e.test.ts`)
   - Configuration extraction from live Saleor instances
   - Handling of existing configurations

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Business-focused tests
pnpm test:business    # All business scenarios
pnpm test:entities    # Entity CRUD operations
pnpm test:selective   # Partial deployments
pnpm test:complex     # Complex business scenarios

# User experience tests
pnpm test:ux          # Error message quality
pnpm test:errors      # Error presentation

# Core workflow tests
pnpm test:smoke       # Quick smoke tests
pnpm test:commands    # Command-specific tests

# Run with verbose output for debugging
VERBOSE=true pnpm test:e2e
```

## What We Test

✅ **Business Value**
- Can users manage their store configuration?
- Do deployments work correctly?
- Are partial updates safe?
- Is data integrity maintained?

✅ **User Experience**
- Are errors clear and actionable?
- Do users get helpful guidance when things go wrong?
- Is the tool intuitive to use?

✅ **Safety & Reliability**
- Are deployments idempotent?
- Do backups work?
- Can users preview changes before applying?

## What We Don't Test

❌ **Technical Implementation Details**
- Docker container internals
- CLI argument parsing mechanics
- Low-level GraphQL operations

❌ **Cosmetic Issues**
- Exact error message formatting
- Help text layout
- Color output in terminals

## Test Environment

Tests use Docker containers with real Saleor instances to ensure realistic testing conditions that catch actual integration issues.
