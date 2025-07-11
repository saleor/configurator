# AI Assistant Guide - Saleor Configurator

Welcome! This guide helps AI assistants quickly understand and work with the Saleor Configurator codebase.

## 📚 Documentation Overview

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **[CLAUDE.md](./CLAUDE.md)** | Main project reference | Understanding project structure, architecture, and key patterns |
| **[CODING-STANDARDS.md](./CODING-STANDARDS.md)** | TypeScript & clean code practices | Writing new code, refactoring, code reviews |
| **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** | Comprehensive testing strategies | Writing tests, understanding test patterns |
| **[GRAPHQL-GUIDE.md](./GRAPHQL-GUIDE.md)** | GraphQL implementation guide | Adding new entities, GraphQL operations |

## 🚀 Quick Start Checklist

### When Adding a New Feature:
- [ ] Read relevant sections in CLAUDE.md
- [ ] Check GRAPHQL-GUIDE.md if adding new entities
- [ ] Follow patterns in CODING-STANDARDS.md
- [ ] Write tests as described in TESTING-GUIDE.md
- [ ] Update relevant documentation

### When Fixing Bugs:
- [ ] Understand the module structure (CLAUDE.md)
- [ ] Check error handling patterns (CODING-STANDARDS.md)
- [ ] Write regression tests (TESTING-GUIDE.md)
- [ ] Use logger for debugging, cliConsole for user output

### When Reviewing Code:
- [ ] Verify TypeScript best practices (no `any` types!)
- [ ] Check test coverage
- [ ] Ensure GraphQL operations follow patterns
- [ ] Validate error handling and user experience

## 🏗️ Architecture Quick Reference

```
User Input (YAML) → Zod Validation → Service Layer → Repository → GraphQL → Saleor API
                          ↓                ↓              ↓           ↓          ↓
                    Type Safety    Business Logic   GraphQL Ops   gql.tada   Response
```

### Key Principles:
1. **Type Safety First**: Never use `any`, leverage TypeScript
2. **User-Friendly Errors**: Clear messages with actionable hints
3. **Idempotent Operations**: Safe to run multiple times
4. **Test Everything**: Unit, integration, and CLI tests
5. **Follow Patterns**: Repository/Service/Module structure

## 🔄 Git Workflow & Quality Gates

### Commit Flow
1. **Stage changes**: `git add .`
2. **Pre-commit runs**: Automatic linting + type checking on staged files
3. **Commit with conventional format**: `git commit -m "feat: add new feature"`
4. **Commit message validated**: Enforces conventional commits format
5. **Push changes**: `git push`
6. **Pre-push runs**: Full test suite + build + security audit

### Quality Gates Overview
- **Pre-commit** (< 10s): Fast feedback on staged files
  - Biome linting/formatting
  - TypeScript type checking
- **Pre-push** (< 30s): Comprehensive safety net
  - Full test suite
  - Build verification  
  - Security audit
  - Type checking
  - Changeset validation (for release management)
- **Commit-msg**: Conventional commits validation
- **Post-merge/checkout**: Automatic maintenance
  - Dependency updates
  - Schema refresh
  - Build cleanup

### Bypassing Hooks (When Necessary)
```bash
# Skip pre-commit checks
git commit --no-verify -m "fix: emergency hotfix"

# Skip pre-push checks  
git push --no-verify

# Skip all hooks
git -c core.hooksPath=/dev/null commit -m "bypass all"
```

## 🛠️ Common Tasks

### Adding a New Entity Type:
1. Define Zod schema in `src/modules/config/schema/schema.ts`
2. Create module directory: `src/modules/[entity]/`
3. Implement repository with GraphQL operations
4. Create service with business logic
5. Add to configurator's push/pull methods
6. Write comprehensive tests
7. Update GRAPHQL-GUIDE.md

### Implementing a GraphQL Operation:
```typescript
// 1. Define operation
const mutation = graphql(`
  mutation CreateEntity($input: EntityInput!) {
    entityCreate(input: $input) {
      entity { id, name }
      errors { field, message }
    }
  }
`);

// 2. Extract types
type EntityInput = VariablesOf<typeof mutation>["input"];

// 3. Handle errors
if (result.error) {
  throw GraphQLError.fromClientError(result.error, "Failed");
}
```

### Writing Tests:
```typescript
// Always test: happy path, validation errors, GraphQL errors, edge cases
describe('EntityService', () => {
  it('should handle all scenarios', async () => {
    // See TESTING-GUIDE.md for comprehensive examples
  });
});
```

## 🔍 Areas Needing Enhancement

### High Priority:
1. **Product Channel Listings**: Missing update mutations
2. **Delete Operations**: No delete implemented for any entity
3. **Bulk Operations**: Improve performance for large datasets
4. **Collections**: Core e-commerce feature not implemented

### Medium Priority:
1. **Media Management**: Product images/documents
2. **Inventory**: Warehouses and stock tracking
3. **Promotions**: Vouchers and sales
4. **SEO**: Meta tags and structured data

### Future Considerations:
1. **Webhooks**: Real-time event handling
2. **Multi-language**: Translation support
3. **Custom Apps**: Extensibility
4. **Import/Export**: Bulk data operations

## 💡 Tips for Success

### DO:
- ✅ **RESEARCH FIRST** - Always check existing tools before building custom solutions
- ✅ **High-quality code only** - Clean, concise, direct implementations
- ✅ Read existing code before implementing
- ✅ Follow established patterns religiously
- ✅ Write meaningful test descriptions
- ✅ Use TypeScript's type system fully
- ✅ Think about user experience
- ✅ Handle errors gracefully
- ✅ Keep functions small and focused
- ✅ **Always run quality checks before committing**:
  ```bash
  # 1. Biome - linting and formatting (replaces ESLint + Prettier)
  pnpm lint       # Auto-fixes all issues
  
  # 2. TypeScript validation
  pnpm typecheck  
  
  # 3. Test suite
  pnpm test       
  
  # 4. Build verification
  pnpm build      
  ```

### DON'T:
- ❌ **Create custom solutions** when good tools exist
- ❌ **Over-engineer** - keep solutions simple and direct
- ❌ Use `any` type (ever!)
- ❌ Skip tests
- ❌ Ignore error handling
- ❌ Break established patterns
- ❌ Mix concerns (keep layers separate)
- ❌ Forget about idempotency

## 📝 Quick Commands

```bash
# Development
pnpm dev              # Run in development
pnpm test            # Run tests
pnpm test:watch      # Watch mode
pnpm lint            # Lint & format (auto-fix)
pnpm build           # Build for production

# Testing specific files
pnpm test product    # Test product module
pnpm test:coverage   # Check coverage

# GraphQL
pnpm fetch-schema    # Update Saleor schema
```

## 🔗 Key Resources

- [Saleor GraphQL Docs](https://docs.saleor.io/api-reference)
- [gql.tada Docs](https://gql-tada.0no.co/)
- [Vitest Docs](https://vitest.dev/)
- [Zod Docs](https://zod.dev/)

## 🎯 Mission

The Saleor Configurator brings "Infrastructure as Code" principles to e-commerce. Every feature should:
- Be declarative and version-controllable
- Provide clear feedback to users
- Handle errors gracefully
- Be thoroughly tested
- Follow established patterns

Remember: **Code is written once but read many times**. Optimize for clarity and maintainability.

---

*Last updated: January 2025*