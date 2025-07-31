# CLAUDE.md - Saleor Configurator Development Guide

This document contains important conventions, implementation details, design decisions, and memories for the Saleor Configurator project to assist Claude Code in understanding and working with the codebase.

## Project Overview

**Saleor Configurator** is a "commerce as code" CLI tool that enables declarative configuration management for Saleor e-commerce platforms. It allows developers to define their entire Saleor configuration in YAML files and synchronize it with their Saleor instances.

**Key Capabilities:**

- **Push**: Apply local configuration to remote Saleor instance
- **Introspect**: Download remote configuration to local YAML files
- **Diff**: Compare local and remote configurations
- **Start**: Interactive wizard for first-time setup

## Architecture & Design Decisions

### Core Architecture

The project follows a **service-oriented architecture** with clear separation of concerns:

```
src/
├── cli/           # CLI framework and user interaction
├── commands/      # Individual CLI commands (push, introspect, diff, start)
├── core/          # Core business logic and orchestration
├── lib/           # Shared utilities and infrastructure
└── modules/       # Domain-specific modules (product, category, etc.)
```

**Key Design Patterns:**

- **Dependency Injection**: ServiceContainer pattern for loose coupling
- **Repository Pattern**: Data access abstraction with GraphQL
- **Command Pattern**: CLI commands as discrete handlers
- **Strategy Pattern**: Multiple comparators for diff operations
- **Factory Pattern**: Service composition and client creation

### Technology Stack

**Runtime & Build:**

- **TypeScript**: Full type safety with strict configuration
- **Node.js 20+**: Modern runtime with ES modules
- **pnpm**: Package manager with workspace support
- **Biome**: Linting and formatting (replaces ESLint + Prettier)

**Core Dependencies:**

- **Commander.js**: CLI framework with TypeScript support
- **URQL**: GraphQL client with caching and auth
- **Zod**: Schema validation and type inference
- **gql.tada**: GraphQL TypeScript codegen
- **tslog**: Structured logging
- **YAML**: Configuration file parsing

## Error Handling System

### Error Hierarchy

The project uses a comprehensive error system with domain-specific error types:

```typescript
BaseError (abstract)
├── EnvironmentVariableError
├── ZodValidationError
├── GraphQLError
│   └── GraphQLUnknownError
├── CliError
│   ├── CliArgumentError
│   ├── CliValidationError
│   └── CliFileError
└── Domain-specific errors (DiffError, AttributeError, etc.)
```

### Error Handling Conventions

**1. Always extend BaseError for custom errors**

```typescript
export class MyDomainError extends BaseError {
  constructor(message: string) {
    super(message, "MY_DOMAIN_ERROR");
  }
}
```

**2. Use GraphQLError.fromCombinedError() for GraphQL errors**

- Automatically detects permission errors, network issues, etc.
- Provides context-aware error messages with helpful advice
- Handles GraphQL errors vs HTTP status codes correctly

**3. Use ZodValidationError.fromZodError() for validation errors**

- Formats Zod validation issues into user-friendly messages
- Includes field paths and specific error types

**4. Domain-specific errors should be co-located**

- Each module has its own `errors.ts` file
- Errors are grouped by domain (CLI, diff, attribute, etc.)

## CLI Framework

### Command Structure

All commands follow a standardized pattern using a `CommandConfig` interface:

```typescript
interface CommandConfig<T extends z.ZodObject<Record<string, z.ZodTypeAny>>> {
  name: string;
  description: string;
  schema: T; // Zod schema for validation
  handler: (args: z.infer<T>) => Promise<void>;
  examples?: string[]; // CLI help examples
  requiresInteractive?: boolean; // Interactive mode support
}
```

### Command Development Conventions

**1. Schema-First Design**

- Define Zod schema first, then implement handler
- Schema doubles as validation and Commander.js option generation
- Extend `baseCommandArgsSchema` for common options

**2. Interactive Argument Resolution**

- Use `maybePromptForUrl()` and `maybePromptForToken()` for missing args
- Always confirm destructive operations with `confirmAction()`
- Provide clear progress indication for long-running operations

**3. Error Handling in Commands**

- Let errors bubble up to global handler
- Use structured logging for debugging
- Provide actionable error messages to users

## GraphQL Integration

### Schema Management

**Schema Source**: Uses versioned Saleor schemas from GitHub

- Version controlled via `package.json` saleor.schemaVersion
- Automatically fetched on `postinstall` hook
- Generates TypeScript types with gql.tada

**Type Generation**: Uses gql.tada for end-to-end type safety

- GraphQL operations are fully typed
- Schema introspection generates `graphql-env.d.ts`
- TypeScript plugin provides IDE integration

### GraphQL Client Configuration

**Client Setup**: Uses URQL with auth exchange

- Bearer token authentication
- Network-only request policy (no caching)
- Automatic auth error detection

**Repository Pattern**: Each domain has a repository for GraphQL operations

- Encapsulates all GraphQL queries/mutations
- Provides type-safe interfaces
- Handles errors with `GraphQLError.fromCombinedError()`

## Configuration System

### Configuration Format

**YAML-Based Configuration**: Declarative configuration files

- Human-readable and version-controllable
- Supports nested structures and references
- Example configuration in `example.yml`

**Schema Definition**: Zod schemas define configuration structure

- Located in `src/modules/config/schema/`
- Provides validation and TypeScript types
- Auto-generates documentation

### Configuration Sections

**Supported Entities:**

- **shop**: Global shop settings
- **channels**: Sales channels with country/currency
- **productTypes**: Product type definitions with attributes
- **pageTypes**: Page type definitions
- **categories**: Category hierarchy
- **products**: Product catalog (reference implementation)

**Attribute System**: Flexible attribute definitions

- Support for various input types (text, dropdown, reference, etc.)
- Reusable attributes across product/page types
- Reference existing attributes or create new ones

## Testing Strategy

### Test Organization

**Test Types:**

- **Unit Tests**: Individual service and utility testing
- **Integration Tests**: End-to-end command testing
- **Schema Tests**: Configuration validation testing

**Test Patterns:**

- Tests are co-located with source files
- Use descriptive test names with business context
- Mock external dependencies (GraphQL client, file system)

### Testing Conventions

**1. Test File Naming**

- `*.test.ts` for unit tests
- `*.integration.test.ts` for integration tests
- `*.selective.test.ts` for selective operation tests

**2. Test Setup**

- Global setup in `src/lib/test-setup.ts`
- Environment configuration for test runs
- Structured logging disabled in tests

**3. Mocking Strategy**

- Mock GraphQL client for repository tests
- Mock file system for configuration tests
- Use real validation for schema tests

## Development Workflow

### Scripts and Commands

**Development:**

- `pnpm dev`: Run CLI with tsx for development
- `pnpm build`: TypeScript compilation
- `pnpm test`: Run test suite with Vitest

**Code Quality:**

- `pnpm lint`: Biome linting
- `pnpm format`: Biome formatting
- `pnpm check`: Combined linting and formatting

**Schema Management:**

- `pnpm fetch-schema`: Download Saleor GraphQL schema
- `pnpm generate-docs`: Generate schema documentation

### Code Quality Standards

**Biome Configuration**: Strict linting and formatting rules

- 100 character line width
- 2-space indentation
- Double quotes for strings
- Trailing commas for ES5 compatibility

**TypeScript Configuration**: Strict type checking

- No unused locals/parameters allowed
- Strict null checks enabled
- gql.tada plugin for GraphQL types
- **NEVER use `as any` in production code** - only allowed in test files for mocking
- Use proper type guards, union types, or generic constraints instead

## Memory & Implementation Details

### Important Patterns

**1. Service Container Pattern**

- All services are registered in `ServiceContainer`
- Dependencies are injected via constructor
- Services are composed in `ServiceComposer`

**2. Selective Operations**

- Use `--include` and `--exclude` flags for selective operations
- Implemented via `SelectiveOptions` utility
- Supports section-based filtering

**3. Diff System**

- Specialized comparators for different entity types
- Multiple output formats (table, JSON, YAML)
- Supports both introspect and push perspectives

### Configuration Validation

**1. Multi-Layer Validation**

- Zod schemas for structure validation
- Business logic validation in services
- GraphQL schema validation on push

**2. Error Context**

- Validation errors include field paths
- Custom error formatters for Zod issues
- Helpful suggestions for common errors

### Performance Considerations

**1. GraphQL Optimization**

- Selective field queries to reduce payload
- Batch operations where possible
- Network-only policy to avoid cache issues

**2. File Operations**

- Streaming for large files
- Backup creation before destructive operations
- Atomic file operations where possible

## Release Management

### Version Control

**Changesets**: Uses changesets for version management

- Create changesets with `pnpm changeset`
- Automatic changelog generation
- GitHub releases with proper tag creation

**Release Process**:

1. Create changeset for changes
2. Merge changeset PR to main
3. Automatic GitHub release creation
4. Tags pushed with `git push --follow-tags`

### CI/CD

**GitHub Actions**: Automated testing and releases

- Release workflow triggered on main branch
- Fetches tags before changeset processing
- Creates GitHub releases with proper versioning

## Development Guidelines

### Entity Identification Guidelines

**IMPORTANT**: All entities that have slugs in the Saleor API must use slugs as their primary identifier for comparisons and uniqueness validation.

#### Current Entity Identification:
- **Categories**: Use `slug` for identification (required field)
- **Channels**: Use `slug` for identification (required field)  
- **Products**: Use `slug` for identification (required field)
- **Page Types**: Use `name` for identification (no slug in API)
- **Product Types**: Use `name` for identification (no slug in API)

#### Implementation Requirements:
1. **Schema Definition**: If an entity has a slug in the API, the schema MUST include it as a required field
2. **Comparator Implementation**: The `getEntityName()` method must return the slug for slug-based entities
3. **Validation**: Use `validateUniqueIdentifiers()` which validates based on the identifier returned by `getEntityName()`
4. **Subcategory/Nested Handling**: Use slug-based maps for comparison when entities have slugs

#### Example Implementation:
```typescript
// Schema with slug
const entitySchema = z.object({
  name: z.string().describe("Entity.name"),
  slug: z.string().describe("Entity.slug"),
});

// Comparator using slug
protected getEntityName(entity: Entity): string {
  if (!entity.slug) {
    throw new EntityValidationError("Entity must have a valid slug");
  }
  return entity.slug;
}
```

This approach ensures entities with the same name but different slugs are correctly treated as separate entities, preventing false duplicate detection errors.

### Adding New Commands

1. Create command file in `src/commands/`
2. Define Zod schema extending `baseCommandArgsSchema`
3. Implement handler function with proper error handling
4. Add command to `src/commands/index.ts` registry
5. Include examples in command configuration

### Adding New Modules

1. Create module directory in `src/modules/`
2. Implement service, repository, and error classes
3. Add module to service container
4. Update configuration schema if needed
5. Add comprehensive tests

### Error Handling Best Practices

1. Always use typed errors extending `BaseError`
2. Provide actionable error messages
3. Include context and suggestions where helpful
4. Use structured logging for debugging
5. Handle GraphQL errors with `GraphQLError.fromCombinedError()`

## Testing Requirements

### Comprehensive Test Plan

**IMPORTANT**: After making any code changes, always run through the comprehensive test plan documented in `TEST_PLAN.md`. This ensures the configurator maintains its integrity across all operations.

**Core Testing Workflow**:
1. Remove existing config: `rm -rf config.yml`
2. Introspect from remote
3. Make critical data changes
4. Deploy changes
5. Deploy again (verify idempotency)
6. Remove config again
7. Introspect again (verify round-trip integrity)
8. Run diff (should show no changes)

See `TEST_PLAN.md` for detailed test scenarios and validation points.

## Common Issues & Solutions

### GraphQL Error Handling

**Issue**: GraphQL returns HTTP 200 even for permission errors
**Solution**: Check `graphQLErrors` array, not HTTP status codes

**Issue**: URQL auth errors not properly detected
**Solution**: Use `extensions.exception.code` for permission detection

### Configuration Validation

**Issue**: Complex nested validation errors
**Solution**: Use `ZodValidationError.fromZodError()` for formatting

**Issue**: Schema changes breaking existing configs
**Solution**: Use schema versioning and migration strategies

### CLI User Experience

**Issue**: Commands failing silently
**Solution**: Comprehensive error handling with exit codes

**Issue**: Missing required arguments
**Solution**: Interactive prompts with `maybePromptFor*()` functions

This document should be updated as the project evolves to maintain accurate development context.
