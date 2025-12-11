# Saleor Configurator Project Overview

## Project Purpose
Saleor Configurator is a "commerce as code" CLI tool that enables declarative configuration management for Saleor e-commerce platforms. It allows developers to define their entire Saleor configuration in YAML files and synchronize it with their Saleor instances.

Key capabilities:
- **Push/Deploy**: Apply local configuration to remote Saleor instance  
- **Introspect**: Download remote configuration to local YAML files
- **Diff**: Compare local and remote configurations
- **Start**: Interactive wizard for first-time setup

## Tech Stack
- **Runtime**: Node.js 20+, TypeScript with strict configuration
- **Package Manager**: pnpm 9+
- **CLI Framework**: Commander.js with TypeScript support
- **GraphQL**: URQL client with gql.tada for type generation
- **Validation**: Zod schemas for configuration validation
- **Testing**: Vitest for unit and integration tests
- **Linting/Formatting**: Biome (replaces ESLint + Prettier)
- **Build**: tsup for ESM bundling
- **Release**: Changesets for version management

## Architecture

### High-Level Structure
Service-oriented architecture with clear separation:
```
src/
├── cli/           # CLI framework and user interaction
├── commands/      # Individual CLI commands (push, introspect, diff, start)
├── core/          # Core business logic and orchestration
├── lib/           # Shared utilities and infrastructure
└── modules/       # Domain-specific modules (product, category, tax, etc.)
```

### Key Architectural Patterns

**1. Repository Pattern**
- All GraphQL access goes through repository classes
- Repositories handle dual error checking (URQL + Saleor business errors)
- Type-safe queries using gql.tada
- Example: `ChannelRepository`, `ProductRepository`

**2. Service Layer**
- Business logic separated from infrastructure
- Bootstrap methods for idempotent deployment
- Error context and wrapping
- Example: `ChannelService.bootstrapChannels()`

**3. Dependency Injection**
- `ServiceContainer` holds all service instances
- `ServiceComposer.compose()` creates and wires dependencies
- Two-phase construction to avoid circular dependencies
- Shared cache-enabled services

**4. Factory Pattern**
- `createConfigurator()` is single entry point
- Encapsulates URQL client and service container creation
- Enables easy testing and configuration

**5. Strategy Pattern (Comparators)**
- `DiffService` uses comparator strategies for each entity type
- Each comparator implements `compare(local, remote)` 
- Normalization removes non-comparable fields (IDs, timestamps)
- Example: `ChannelComparator`, `ProductComparator`

### Critical Architectural Decisions

**Network-Only Policy:**
- URQL configured with `requestPolicy: "network-only"`
- No caching (always fresh data from Saleor)
- Simpler debugging, no cache invalidation needed
- Acceptable for CLI tool (not real-time UI)

**Dual Error Checking:**
- Check both `result.error` (URQL/network) AND `result.data.mutation.entity` (Saleor business)
- Pattern: `if (!result.data?.mutation.entity) { throw }`
- Catches both transport and business logic errors

**Sequential Deployment:**
- Enforces dependencies naturally (channels before products)
- Simpler error handling and debugging
- Future: Consider parallelization for independent operations

**Idempotent Bootstrap:**
- getOrCreate pattern for all entities
- Re-runnable deployments without duplication
- Checks existence before creation

For comprehensive architectural details, see the `configurator_architecture_deep_dive` memory.

## Configuration
- **YAML-based**: Human-readable configuration files
- **Schema-driven**: Zod schemas provide validation and TypeScript types
- **Supports**: shop settings, channels, product types, categories, tax classes, warehouses, shipping zones, collections, menus, models (pages)
- **Saleor Schema Version**: 3.20 (configurable in package.json)

## Unique Aspects

**Commerce as Code Philosophy:**
- Infrastructure-as-Code applied to e-commerce
- Version control for store configuration
- Environment parity (dev, staging, production)
- Reproducible deployments

**Type Safety Throughout:**
- GraphQL schema → gql.tada → TypeScript types
- Config YAML → Zod validation → TypeScript types
- Compile-time errors for schema mismatches
- No manual type definitions needed

**Error Recovery & Resilience:**
- ServiceErrorWrapper for batch operations
- Detailed error context and recovery hints
- Preflight validation to catch issues early
- Corrupted remote state handling (deduplicate on introspect)

## Development Best Practices

**For Serena Users:**
- Start with `get_symbols_overview` for large files (>500 lines)
- Use symbolic tools (`find_symbol`) to read targeted code
- Always check `codebase_architecture_map` for file sizes
- Leverage architectural memories for deep understanding

**For Adding Features:**
1. Check `configurator_architecture_deep_dive` for patterns
2. Follow repository → service → configurator flow
3. Add tests at each layer
4. Update schemas if config format changes

**For Debugging:**
1. Enable debug logging: `LOG_LEVEL=debug`
2. Check dual error sources (URQL + Saleor)
3. Test query in GraphQL Playground first
4. Verify token permissions