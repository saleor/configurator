# Task Completion Checklist

When completing any development task, ALWAYS run these commands in order:

## 1. Code Quality Checks
```bash
pnpm check:fix  # Auto-fix all linting and formatting issues
```

## 2. Type Checking
```bash
# TypeScript compilation is included in the build process
pnpm build  # Verify TypeScript compilation passes
```

## 3. Testing
```bash
pnpm test  # Run all unit and integration tests
```

## 4. Final Verification
```bash
pnpm check  # Final check that everything passes
```

## Additional Checks for Tax Module Changes
When working with the tax module specifically:

1. **Schema Validation**: Ensure tax class schema changes don't break existing configs
2. **GraphQL Integration**: Verify GraphQL operations work with Saleor 3.20 schema
3. **Error Handling**: Test error scenarios (missing permissions, network issues, etc.)
4. **Deployment Integration**: Verify tax classes deploy correctly in the deployment pipeline

## Before Committing
- Ensure no `as any` types in production code
- Verify all error handling extends BaseError appropriately  
- Check that new modules follow service-oriented architecture patterns
- Confirm test coverage for new functionality

## Release Checklist (if applicable)
1. Create changeset: `pnpm changeset`
2. Update version: `pnpm version` 
3. Test in development environment
4. Verify deployment works end-to-end