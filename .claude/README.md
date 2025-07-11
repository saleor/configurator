# Claude AI Assistant - Additional Documentation

This directory contains detailed documentation that is automatically imported by the main CLAUDE.md file at the project root. These files are organized here to keep the developer workflow clean while providing comprehensive guidance for AI assistants.

## 📁 How It Works

The main **CLAUDE.md** file at the project root automatically imports these files using Claude's memory import syntax:
- `@.claude/CODING-STANDARDS.md`
- `@.claude/TESTING-GUIDE.md`
- `@.claude/GRAPHQL-GUIDE.md`

## 📚 Documentation Files

| File | Purpose | Contents |
|------|---------|----------|
| **[CODING-STANDARDS.md](./CODING-STANDARDS.md)** | TypeScript & clean code practices | Type safety, error handling, checklists |
| **[TESTING-GUIDE.md](./TESTING-GUIDE.md)** | Comprehensive testing strategies | Test scenarios, mocking, CLI testing |
| **[GRAPHQL-GUIDE.md](./GRAPHQL-GUIDE.md)** | GraphQL implementation guide | Adding entities, patterns, examples |
| **[AI-ASSISTANT-README.md](./AI-ASSISTANT-README.md)** | Quick reference | Commands, tips, common tasks |

## 🚀 Usage

AI assistants should:
1. **Start with root CLAUDE.md** - It's the main entry point
2. **Imported docs load automatically** - No need to manually read them
3. **Reference specific sections** as needed during tasks

## 🎯 Key Principles

1. **Never use `any` type** - TypeScript strict mode always
2. **Test everything** - Plan scenarios before writing tests
3. **Follow patterns** - Repository → Service → Configurator
4. **Quality checks** - Always run `pnpm check`, `pnpm test`, `pnpm build`
5. **User first** - Clear error messages and helpful output

## 🛠️ Essential Commands

```bash
# Before ANY commit
pnpm lint       # Biome linting/formatting (auto-fix)
pnpm typecheck  # Verify types
pnpm test       # Run tests
pnpm build      # Ensure it builds

# Development
pnpm dev        # Run in dev mode
pnpm test:watch # Watch mode for tests
```

## 📋 Quick Checklists

### Adding a New Feature
1. Read relevant patterns in documentation
2. Create Zod schema if needed
3. Implement repository → service → configurator
4. Write comprehensive tests
5. Update GraphQL guide if adding entities
6. Run all quality checks

### Fixing Bugs
1. Understand the module structure
2. Write failing test first
3. Fix the bug
4. Ensure all tests pass
5. Run quality checks

## 🚫 Never Do This

- Use `any` type
- Skip tests
- Ignore error handling
- Break established patterns
- Commit without running checks
- Mock internal utilities
- Create files outside established structure

## 📝 Documentation Maintenance

When updating these docs:
1. Keep examples current with codebase
2. Update checklists based on new patterns
3. Add new sections as needed
4. Ensure consistency across all docs

---

*This documentation is specifically for AI assistants. For general developer documentation, see the main project README.*