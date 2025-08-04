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
- **Unified Manager Pattern**: Single interface for multiple configuration formats

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

### Configuration Formats

**Hybrid Configuration Support**: The configurator supports both YAML and TypeScript configuration formats

**YAML Configuration** (Legacy):
- Human-readable and version-controllable
- Supports nested structures and references
- Example configuration in `example.yml`
- Ideal for simple configurations and non-technical users

**TypeScript Configuration** (Recommended):
- Full compile-time type safety and IntelliSense
- Programmatic configuration with helper functions
- Code completion and validation in IDE
- Example configuration in `example-config.ts`
- Supports computed values, functions, and advanced TypeScript features

**Auto-Detection**: The system automatically detects configuration format based on file extension:
- `.yml`, `.yaml` → YAML configuration
- `.ts`, `.mts` → TypeScript configuration

**Schema Definition**: Zod schemas define configuration structure

- Located in `src/modules/config/schema/`
- Provides validation and TypeScript types for both formats
- Shared validation ensures consistency between YAML and TypeScript configs

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

### TypeScript Configuration System

**Core API**: Centered around `createSaleorConfig()` function

```typescript
import { createSaleorConfig, attribute } from "@saleor/configurator";

export default createSaleorConfig({
  shop: {
    defaultMailSenderName: "My Shop",
    defaultMailSenderAddress: "noreply@example.com"
  },
  channels: [
    {
      name: "US Store",
      slug: "us-store", 
      currencyCode: "USD",
      defaultCountry: "US"
    }
  ]
});
```

**Attribute Helpers**: Type-safe attribute creation

```typescript
productTypes: [
  {
    name: "T-Shirt",
    productAttributes: [
      attribute.dropdown("Size", ["XS", "S", "M", "L", "XL"]),
      attribute.plainText("Material"),
      attribute.reference("Brand", "PRODUCT")
    ]
  }
]
```

**File Organization**:
- `src/modules/config/typescript/index.ts` - Main API exports
- `src/modules/config/typescript/config-builder.ts` - `createSaleorConfig()` implementation
- `src/modules/config/typescript/helpers.ts` - Attribute helper functions
- `src/modules/config/typescript/types.ts` - TypeScript type definitions
- `src/modules/config/typescript/loader.ts` - Dynamic import and validation
- `src/modules/config/typescript/generator.ts` - Code generation for introspect

**Introspect Behavior**: TypeScript configs maintain their format during introspect:
- TypeScript config file → introspect → generates TypeScript code
- YAML config file → introspect → saves as YAML
- Preserves the developer's chosen format and workflow

**Example Files**:
- `example.yml` - YAML configuration example showing traditional approach
- `example-config.ts` - TypeScript configuration example with advanced features:
  - Computed values and variables
  - Reusable attribute definitions  
  - Helper functions for channel creation
  - Comments and documentation

**CLI Usage with TypeScript**:
```bash
# Deploy TypeScript configuration
saleor-configurator deploy --config config.ts

# Introspect to TypeScript file  
saleor-configurator introspect --config config.ts

# Diff TypeScript configuration
saleor-configurator diff --config config.ts
```

**Runtime Requirements**: TypeScript configs require Node.js with TypeScript support:
- Run with `tsx`: `tsx node_modules/.bin/saleor-configurator deploy --config config.ts`
- Or with ts-node: `ts-node -m esm node_modules/.bin/saleor-configurator deploy --config config.ts`
- The CLI automatically handles TypeScript execution when config file is `.ts`

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

**4. TypeScript Configuration Testing**

- Test both YAML and TypeScript configuration loading
- Validate code generation produces executable TypeScript
- Ensure format preservation during introspect operations
- Test attribute helper functions with all input types
- Verify error handling for invalid TypeScript configurations

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

**4. Unified Configuration Management**

- `UnifiedConfigurationManager` handles both YAML and TypeScript formats
- Auto-detection based on file extension (`.ts/.mts` vs `.yml/.yaml`)
- Format preservation during introspect operations
- TypeScript configs use dynamic imports with validation
- Code generation maintains readable, idiomatic TypeScript output

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

**Writing Changesets**:

When creating or updating a changeset for a branch:

1. **Review Everything**: Thoroughly review all changes made on the current branch
2. **Find the Right Changeset**: Look for the changeset file that contains `"@saleor/configurator": patch` (or minor/major) - this is the one to edit
3. **Don't Edit Other Changesets**: Other changeset files are ready for merge/publish - do not modify them
4. **Write for NPM Users**: The changeset will appear in the npm package changelog, so write for engineers who will read it

**Changeset Content Guidelines**:
- **Be Concise**: Summarize the change in 1-2 sentences
- **Be Pragmatic**: Focus on what changed and why it matters to users
- **Be Human Readable**: Avoid technical jargon, use clear language
- **Include Impact**: Mention if it fixes bugs, adds features, or changes behavior

**Example Changeset**:
```markdown
---
"@saleor/configurator": patch
---

Fixed entity identification to use slugs instead of names for categories and channels. This resolves issues where entities with the same name but different slugs were incorrectly treated as duplicates.
```

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

### TypeScript Configuration Development

**Adding TypeScript Support for New Entities**:

1. **Update TypeScript Types**: Add entity type to `src/modules/config/typescript/types.ts`
2. **Extend Attribute Helpers**: Add new attribute types to `helpers.ts` if needed
3. **Update Code Generator**: Add generation logic in `generator.ts` for new entity types
4. **Maintain API Consistency**: Ensure all new features work with both YAML and TypeScript configs

**Code Generation Guidelines**:

1. **Template-Based Generation**: Use string templates for readable generated code
2. **Recursive Handling**: Support nested structures (like category subcategories)
3. **Helper Usage**: Generate code that uses `attribute` helpers for type safety
4. **Proper Formatting**: Maintain consistent indentation and code style

**Configuration Manager Guidelines**:

1. **Format Detection**: Use `isTypeScriptConfig()` to detect file format
2. **Format Preservation**: Save configs in the same format they were loaded from
3. **Error Handling**: Provide clear errors for TypeScript compilation issues
4. **Import Validation**: Ensure TypeScript configs have proper default exports

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

### TypeScript Configuration Issues

**Issue**: TypeScript config file not loading properly
**Solution**: Ensure the file has a default export with `export default createSaleorConfig(...)`

**Issue**: Dynamic import errors with TypeScript configs
**Solution**: Verify Node.js version (>=20) and ensure TypeScript/tsx is available

**Issue**: Generated TypeScript code from introspect is malformed
**Solution**: Check that the source configuration has valid structure; complex nested objects may need manual cleanup

**Issue**: TypeScript config shows "Module not found" errors
**Solution**: Run with tsx: `npx tsx node_modules/.bin/saleor-configurator [command] --config config.ts`

**Issue**: Introspect overwrites TypeScript config with YAML
**Solution**: Verify the `UnifiedConfigurationManager` properly detects `.ts` files and uses TypeScript generation

This document should be updated as the project evolves to maintain accurate development context.
