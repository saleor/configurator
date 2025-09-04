# Development Workflows Guide

Comprehensive development procedures, branching strategies, code review processes, and quality assurance workflows for the Saleor Configurator project.

## Development Environment Setup

### Initial Setup

**Prerequisites:**
- Node.js 20+
- pnpm (latest)
- Git configured with proper credentials

**Local Development Setup:**
```bash
# 1. Clone repository
git clone https://github.com/saleor/configurator.git
cd configurator

# 2. Install dependencies
pnpm install

# 3. Build project
pnpm build

# 4. Run tests to verify setup
pnpm test

# 5. Verify CLI functionality
pnpm dev start
```

**Environment Configuration:**
```bash
# Create local environment file
touch .env.local

# Add test environment variables
echo "TEST_URL=https://store-rzalldyg.saleor.cloud/graphql/" >> .env.local
echo "TEST_TOKEN=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs" >> .env.local
```

### Development Tools Configuration

**VS Code Extensions (Recommended):**
- Biome (for linting/formatting)
- TypeScript Hero (for import organization)
- GraphQL Language Feature Support
- YAML Language Support

**Biome Configuration:**
```bash
# Format and lint check
pnpm check

# Auto-fix issues
pnpm check:fix

# CI-level validation
pnpm check:ci
```

## Branching Strategy

### Branch Types

**Main Branch:**
- `main`: Production-ready code
- All releases come from main
- Protected branch with required reviews

**Feature Branches:**
- `feature/short-description`: New features
- `feat/entity-type-support`: Major feature additions
- `feat/improve-error-handling`: Feature improvements

**Fix Branches:**
- `fix/issue-description`: Bug fixes
- `fix/deployment-validation`: Critical fixes
- `hotfix/security-issue`: Emergency fixes

**Chore Branches:**
- `chore/update-dependencies`: Maintenance tasks
- `chore/improve-documentation`: Documentation updates
- `chore/refactor-service-layer`: Code refactoring

### Branch Naming Conventions

**Pattern**: `type/short-description`

**Examples:**
```bash
# Features
feature/add-warehouse-support
feat/selective-deployment
feat/improve-diff-output

# Bug fixes
fix/category-slug-validation  
fix/graphql-error-handling
hotfix/token-validation

# Maintenance
chore/update-dependencies
chore/improve-test-coverage
chore/refactor-comparators
```

## Feature Development Workflow

### Complete Feature Development Process

**1. Planning and Setup:**
```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/new-entity-support

# Ensure clean development environment
pnpm install
pnpm build
pnpm test
```

**2. Development Phase:**
```bash
# Make incremental changes
# Follow TDD approach when applicable
# Run tests frequently during development
pnpm test src/modules/new-entity/

# Check code quality regularly
pnpm check:fix
pnpm build
```

**3. Testing and Validation:**
```bash
# Run comprehensive test suite
pnpm test

# Validate TypeScript compilation
npx tsc --noEmit

# Test CLI functionality with real environment
pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN
pnpm dev diff --url=$TEST_URL --token=$TEST_TOKEN --dry-run
```

**4. Pre-commit Quality Assurance:**
```bash
# MANDATORY: Full quality pipeline
pnpm check:fix    # Fix linting/formatting
pnpm build        # Verify compilation
pnpm test         # Run all tests
npx tsc --noEmit  # TypeScript validation
pnpm check:ci     # Final CI-level check
```

**5. Commit and Push:**
```bash
# Stage changes
git add .

# Commit with conventional message
git commit -m "feat: add warehouse entity support with validation"

# Push feature branch
git push origin feature/new-entity-support
```

### Interactive Development Testing

**End-to-End CLI Testing Protocol (MANDATORY for core changes):**
```bash
# Test credentials
URL="https://store-rzalldyg.saleor.cloud/graphql/"
TOKEN="YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs"

# Complete validation workflow
rm -rf config.yml                           # 1. Clean slate
pnpm dev introspect --url=$URL --token=$TOKEN  # 2. Fresh introspection
# Edit config.yml with test changes            # 3. Apply your changes  
pnpm dev deploy --url=$URL --token=$TOKEN      # 4. Deploy changes
pnpm dev deploy --url=$URL --token=$TOKEN      # 5. Test idempotency
rm config.yml                               # 6. Clean again
pnpm dev introspect --url=$URL --token=$TOKEN  # 7. Re-introspect
pnpm dev diff --url=$URL --token=$TOKEN        # 8. Should show no changes
```

## Code Review Process

### Pull Request Requirements

**PR Creation Checklist:**
- [ ] Feature branch is up to date with main
- [ ] All quality checks pass (see mandatory checklist)
- [ ] End-to-end CLI testing completed (for core changes)
- [ ] Changeset created for version management
- [ ] Tests cover new functionality
- [ ] Documentation updated if needed

**PR Template:**
```markdown
## Summary
Brief description of changes and motivation

## Changes Made
- Bullet points of specific changes
- New features or fixes implemented
- Configuration or schema changes

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass  
- [ ] End-to-end CLI testing completed
- [ ] Manual testing performed

## Changeset
- [ ] Changeset created with appropriate version bump
- [ ] Changeset describes user-facing impact

## Documentation
- [ ] Code comments added for complex logic
- [ ] Documentation updated if needed
- [ ] Schema documentation regenerated if applicable
```

### Review Guidelines

**For Reviewers:**

1. **Code Quality Review:**
   - Check TypeScript usage (no `as any` in production)
   - Verify error handling follows project patterns
   - Ensure proper type safety and validation
   - Review test coverage and quality

2. **Architecture Review:**
   - Verify service pattern adherence
   - Check dependency injection usage
   - Validate entity identification patterns
   - Review GraphQL integration approach

3. **Testing Review:**
   - Confirm comprehensive test coverage
   - Verify mock usage is appropriate
   - Check integration test completeness
   - Validate end-to-end testing for core changes

**Review Process:**
- All PRs require at least one approval
- Core changes require two approvals
- Automated checks must pass before merge
- Squash and merge strategy preferred

## Quality Assurance Workflows

### Mandatory Pre-Push Checklist

⚠️ **CRITICAL**: These steps are non-bypassable for ANY code changes:

```bash
# 1. Linting and formatting fixes
pnpm check:fix

# 2. TypeScript compilation verification
pnpm build

# 3. Complete test suite execution
pnpm test

# 4. Strict TypeScript validation
npx tsc --noEmit

# 5. CI-level quality validation
pnpm check:ci
```

### Additional Quality Checks

**Schema Validation:**
```bash
# Verify schema consistency
pnpm fetch-schema
pnpm generate-schema-docs

# Check GraphQL type generation
npx gql.tada generate
npx gql.tada check
```

**Performance Validation:**
```bash
# Build performance check
time pnpm build

# Test execution performance
time pnpm test

# CLI performance with real data
time pnpm dev introspect --url=$TEST_URL --token=$TEST_TOKEN
```

**Security Validation:**
```bash
# Check for security vulnerabilities
pnpm audit

# Validate environment variable usage
grep -r "process.env" src/ --exclude-dir=test

# Check for hardcoded secrets
git secrets --scan
```

## Continuous Integration Workflows

### GitHub Actions Integration

**Automated Checks on PR:**
- Linting and formatting validation
- TypeScript compilation
- Complete test suite execution
- Build artifact generation
- Security vulnerability scanning

**Automated Actions on Main:**
- All PR checks
- Changeset processing
- Package publishing
- GitHub release creation
- Documentation deployment

### Local CI Simulation

**Pre-Push CI Simulation:**
```bash
# Simulate GitHub Actions locally
CI=true pnpm check:ci
CI=true pnpm build
CI=true pnpm test

# Verify no environment-specific dependencies
unset NODE_ENV
pnpm build
pnpm test
```

## Release Preparation Workflows

### Changeset Management

**Creating Changesets:**
```bash
# Generate changeset interactively
pnpm changeset

# Review and edit changeset files
ls .changeset/
cat .changeset/changeset-name.md
```

**Changeset Guidelines:**
```markdown
---
"@saleor/configurator": patch  # or minor/major
---

Brief description of user-facing changes. This appears in changelog and npm.

Focus on:
- What changed from user perspective
- Why the change was made
- Any breaking changes or migration requirements
```

### Pre-Release Testing

**Release Candidate Testing:**
```bash
# Build release candidate
pnpm build

# Test CLI functionality comprehensively
node dist/main.js --version
node dist/main.js start
node dist/main.js introspect --help

# Test with real environment
node dist/main.js introspect --url=$TEST_URL --token=$TEST_TOKEN
node dist/main.js diff --url=$TEST_URL --token=$TEST_TOKEN
```

**Release Verification:**
```bash
# Verify package.json consistency
cat package.json | jq '.version'

# Check changeset status
pnpm changeset status

# Verify GitHub release preparation
git tag --list --sort=-version:refname | head -5
```

## Troubleshooting Development Issues

### Common Development Issues

**Build Failures:**
```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
rm -rf dist/
pnpm install
pnpm build
```

**Test Failures:**
```bash
# Run tests in isolation
pnpm test --reporter=verbose

# Debug specific test file
pnpm test src/modules/category/category-service.test.ts --reporter=verbose

# Check test environment
CI=true pnpm test
```

**Type Errors:**
```bash
# Force TypeScript recheck
npx tsc --noEmit --force

# Check specific module
npx tsc --noEmit --include="src/modules/product/**/*"
```

### Development Environment Reset

**Complete Environment Reset:**
```bash
# Clean all generated files
rm -rf node_modules/
rm -rf dist/
rm -rf .cache/

# Reinstall dependencies
pnpm install

# Rebuild everything
pnpm build

# Verify functionality
pnpm test
pnpm dev --help
```

## Best Practices Summary

### Development Best Practices

1. **Incremental Development**: Make small, focused changes
2. **Test-Driven Approach**: Write tests for new functionality
3. **Frequent Quality Checks**: Run checks during development
4. **Documentation Updates**: Keep documentation current
5. **End-to-End Validation**: Test complete workflows

### Git Best Practices

1. **Atomic Commits**: Each commit represents one logical change
2. **Descriptive Messages**: Use conventional commit format
3. **Clean History**: Squash related commits before merge
4. **Branch Hygiene**: Delete merged branches promptly
5. **Regular Synchronization**: Keep feature branches updated

### Code Quality Best Practices

1. **Type Safety**: Never use `as any` in production code
2. **Error Handling**: Use proper error hierarchies
3. **Performance**: Prefer Serena tools over bash commands
4. **Testing**: Comprehensive coverage for all services
5. **Documentation**: Code should be self-documenting

---

**Related Documentation:**
- [CODE_QUALITY.md](CODE_QUALITY.md) - Code quality standards and TypeScript best practices
- [COMMANDS.md](COMMANDS.md) - CLI command reference for development testing
- [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) - Detailed testing procedures
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Development issue resolution
- [ARCHITECTURE.md](ARCHITECTURE.md) - Service architecture patterns
- [CLAUDE.md](CLAUDE.md) - Main navigation hub