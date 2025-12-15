# CLAUDE.md - Saleor Configurator Navigation Hub

Central navigation hub for all Saleor Configurator development documentation. This document provides project overview, core principles, and directs to specialized documentation files for efficient information lookup.

## Project Overview

**Saleor Configurator** is a "commerce as code" CLI tool that enables declarative configuration management for Saleor e-commerce platforms. It allows developers to define their entire Saleor configuration in YAML files and synchronize it with their Saleor instances.

### Key Capabilities
- **Deploy**: Apply local configuration to remote Saleor instance
- **Introspect**: Download remote configuration to local YAML files  
- **Diff**: Compare local and remote configurations
- **Start**: Interactive wizard for first-time setup

### Core Architecture
Service-oriented architecture with dependency injection, repository pattern, and command pattern implementation using TypeScript, Node.js 20+, pnpm, and Biome for code quality.

## Documentation Architecture

This documentation follows a **hub-and-spoke model** for optimal information retrieval. Each specialized file focuses on a specific domain:

### 📋 Essential References
- **[COMMANDS.md](COMMANDS.md)** - Complete CLI command syntax, examples, and usage patterns
- **[ENTITY_REFERENCE.md](ENTITY_REFERENCE.md)** - Entity identification strategies and implementation patterns
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Decision trees, diagnostic commands, and error recovery procedures

### 🔧 Development & Workflows  
- **[CODE_QUALITY.md](CODE_QUALITY.md)** - TypeScript best practices, clean code, functional programming, and Zod patterns
- **[DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md)** - Development procedures, branching, and code review processes
- **[TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md)** - End-to-end testing procedures and validation workflows
- **[AGENTS.md](../AGENTS.md)** - Contributor workflow primer and quick navigation tips for agents

### 🏗️ Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Service patterns, design decisions, and system architecture
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Pipeline architecture and deployment procedures
- **[EXAMPLES.md](EXAMPLES.md)** - Essential configuration examples and patterns

## Claude Code Skills

**ALWAYS** check and use available skills in `.claude/skills/` before starting work. These provide domain-specific guidance and enforce project standards.

| Skill | Use When |
|-------|----------|
| `implementing-cli-patterns` | Adding CLI output, spinners, prompts |
| `creating-changesets` | Preparing releases, version bumps |
| `analyzing-test-coverage` | Writing tests, Vitest, MSW mocks |
| `validating-pre-commit` | Running quality checks before commit |
| `understanding-saleor-domain` | Working with entities, config schema |
| `writing-graphql-operations` | GraphQL queries, gql.tada, repositories |
| `managing-github-ci` | GitHub Actions, workflows, CI issues |
| `designing-zod-schemas` | Validation schemas, branded types |
| `reviewing-typescript-code` | Code review, type safety audits |
| `adding-entity-types` | Implementing new Saleor entity support |

Invoke skills proactively when the task matches their domain.

## Quick Start Essentials

### Mandatory Pre-Push Checklist

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

### End-to-End CLI Testing Protocol

**MANDATORY** before pushing core changes:

```bash
# Test environment credentials
--url=https://store-rzalldyg.saleor.cloud/graphql/
--token=YbE8g7ZNl0HkxdK92pfNdLJVQwV0Xs

# Full validation workflow:
rm -rf config.yml                    # 1. Clean slate
pnpm dev introspect [credentials]    # 2. Fresh introspection
# Edit config.yml (make test changes) # 3. Apply your changes
pnpm dev deploy [credentials]        # 4. Deploy changes
pnpm dev deploy [credentials]        # 5. Test idempotency  
rm config.yml                        # 6. Clean again
pnpm dev introspect [credentials]    # 7. Re-introspect
pnpm dev diff [credentials]          # 8. Should show no changes
```

### Entity Identification Quick Reference

| Entity | Identifier | Type | Required Field |
|--------|------------|------|----------------|
| Categories, Channels, Collections, Menus, Products, Warehouses | **slug** | slug-based | `slug: string` |
| ProductTypes, PageTypes, TaxClasses, ShippingZones, Attributes | **name** | name-based | `name: string` |
| Shop | singleton | unique | N/A |

## Core Development Principles

### 1. Type Safety First
- **NEVER** use `as any` in production code (only allowed in test mocks)
- Use proper type guards, union types, and generic constraints
- Maintain strict TypeScript configuration

### 2. Error Handling Standards
- Always extend `BaseError` for custom errors
- Use `GraphQLError.fromCombinedError()` for GraphQL operations
- Use `ZodValidationError.fromZodError()` for validation errors
- Provide actionable error messages with context

### 3. Entity Management Rules
- **Slug-based entities** MUST use `slug` for identification and comparison
- **Name-based entities** MUST use `name` for identification
- Always validate unique identifiers within entity collections
- Follow dependency order for deployments

### 4. Tooling & Exploration
- Prefer repository-aware commands (`rg`, `pnpm test --watch`, TypeScript references) for fast navigation instead of grepping entire files blindly
- Use symbol-aware IDE features (TypeScript language server, outline view) before opening large files
- Keep local notes in `docs/` when discovering new prompts, schemas, or troubleshooting recipes so other agents inherit the knowledge
- Treat automation scripts in `scripts/` and fixtures in `src/test-helpers` as first stops before rolling custom tooling

### 5. Testing Requirements
- Comprehensive test coverage for all service operations
- Mock external dependencies consistently
- Use real validation for schema tests
- Always run full pre-push checklist

## Documentation Usage Patterns

### For Specific Tasks

**Code Quality**: See [CODE_QUALITY.md](CODE_QUALITY.md) for TypeScript best practices and clean code patterns
**Command Usage**: See [COMMANDS.md](COMMANDS.md) for complete syntax and examples
**Entity Implementation**: See [ENTITY_REFERENCE.md](ENTITY_REFERENCE.md) for patterns and identification rules
**Error Resolution**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for systematic diagnosis
**Development Setup**: See [DEVELOPMENT_WORKFLOWS.md](DEVELOPMENT_WORKFLOWS.md) for procedures
**Testing Issues**: See [TESTING_PROTOCOLS.md](TESTING_PROTOCOLS.md) for validation workflows

### For Architecture Understanding

**System Design**: See [ARCHITECTURE.md](ARCHITECTURE.md) for service patterns and decisions
**Deployment Logic**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for pipeline architecture  
**Migration Issues**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#migration-issues) for version compatibility
**Token Management**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#token-storage) for secure storage

### For Implementation Examples

**Complex Scenarios**: See [EXAMPLES.md](EXAMPLES.md) for case studies and patterns
**Agent Playbook**: See [../AGENTS.md](../AGENTS.md) for the quick-reference guide on project structure, tooling, and collaboration
**Tool Integration**: See specialized files for domain-specific implementation details

## Technology Stack

### Runtime & Build
- **TypeScript**: Full type safety with strict configuration
- **Node.js 20+**: Modern runtime with ES modules
- **pnpm**: Package manager with workspace support
- **Biome**: Linting and formatting

### Core Dependencies
- **Commander.js**: CLI framework with TypeScript support
- **URQL**: GraphQL client with caching and auth
- **Zod**: Schema validation and type inference
- **gql.tada**: GraphQL TypeScript codegen
- **tslog**: Structured logging
- **YAML**: Configuration file parsing

## Release Management

### Changeset Workflow
Uses [Changesets](https://github.com/changesets/changesets) for version management:

```bash
# 1. Document changes
pnpm changeset

# 2. Commit changeset  
git add .changeset/
git commit -m "chore: add changeset for feature"

# 3. Automatic releases after merge to main
```

### Version Compatibility
- **Saleor 3.20+**: Full compatibility with current schema
- **Node.js 20+**: Required runtime version
- **TypeScript 5.0+**: Required for build process

## Important Instruction Reminders

### File Creation Policy
- **NEVER** create files unless absolutely necessary
- **ALWAYS** prefer editing existing files
- **NEVER** proactively create documentation files unless explicitly requested
- Only create files when essential for achieving the specific goal

### Development Focus
- Do what has been asked; nothing more, nothing less
- Follow the hub-and-spoke documentation model for efficient lookup
- Use the specialized documentation files for domain-specific information
- Maintain focus on productivity without hallucinations or rework

---

**Last Updated**: This navigation hub is maintained as the central entry point. Individual documentation files contain detailed, domain-specific information optimized for Claude Code productivity and accuracy.

**Documentation Philosophy**: Each specialized file contains 200-500 lines of focused, actionable information rather than one large comprehensive document, enabling efficient context usage and faster information retrieval.
