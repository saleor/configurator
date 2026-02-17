---
name: understanding-saleor-domain
description: "Explains Saleor e-commerce domain and Configurator business rules. Use when working with entity identification (slug vs name), YAML config structure, entity relationships, deployment pipeline stages, or synchronization logic. Do NOT use for general TypeScript questions or non-Saleor e-commerce platforms."
allowed-tools: "Read, Grep, Glob, Bash(pnpm:*), Bash(git:*), Bash(ls:*)"
metadata:
  author: Ollie Shop
  version: 1.0.0
compatibility: "Claude Code with Node.js >=20, pnpm, TypeScript 5.5+"
---

# Saleor Domain Expert

## Overview

Deep domain knowledge about the Saleor e-commerce platform and the Configurator's business logic for entity management, configuration, deployment, and synchronization.

## When to Use

- Implementing new entity types or features
- Understanding entity identification patterns (slug vs name)
- Working with deployment pipeline stages
- Debugging configuration synchronization issues
- Understanding business rules and constraints

## Quick Reference

| CLI Command | Purpose |
|-------------|---------|
| `pnpm dev introspect` | Download remote config to local YAML |
| `pnpm dev deploy` | Apply local YAML to remote Saleor |
| `pnpm dev diff` | Compare local vs remote config |
| `pnpm dev start` | Interactive first-time setup |

## Core Concepts

A "commerce as code" CLI tool for declarative configuration management of Saleor e-commerce platforms:
- Single source of truth for store state (YAML in git)
- Version-controlled, reproducible deployments
- Declarative over imperative management

## Entity Identification System

**Critical Rule**: Every entity has exactly ONE identification strategy.

### Slug-Based Entities

Identified by `slug` field (URL-friendly identifiers):

| Entity | Example |
|--------|---------|
| Categories | `electronics` |
| Channels | `default-channel` |
| Collections | `summer-sale` |
| Menus | `main-navigation` |
| Products | `iphone-15-pro` |
| Warehouses | `us-east-warehouse` |

### Name-Based Entities

Identified by `name` field (internal configuration):

| Entity | Example |
|--------|---------|
| ProductTypes | `Physical Product` |
| PageTypes | `Blog Post` |
| TaxClasses | `Standard Rate` |
| ShippingZones | `North America` |
| Attributes | `Color` |

### Singleton Entities

Only one instance exists (no identifier needed): **Shop** (global store settings).

## Deployment Pipeline

### Stage Order (Dependencies Matter)

```
1. Validation       -> Pre-flight checks
2. Shop Settings    -> Global configuration
3. Product Types    -> Must exist before products
4. Page Types       -> Must exist before pages
5. Attributes       -> Used by product/page types
6. Categories       -> Product organization
7. Collections      -> Product groupings
8. Warehouses       -> Required for inventory
9. Shipping Zones   -> Geographic shipping rules
10. Products        -> Depends on types, categories
11. Tax Config      -> Tax rules and classes
12. Channels        -> Sales channels
13. Menus           -> Navigation (may reference products)
14. Models          -> Custom data models
```

**Key dependency**: Cannot create a Product without its ProductType existing first.

### Stage Execution Pattern

Each stage follows: Fetch remote state -> Compare local vs remote -> Plan creates/updates/deletes -> Execute with chunking -> Report results.

## Configuration Schema

Top-level keys: `shop`, `channels`, `taxClasses`, `productTypes`, `pageTypes`, `attributes`, `categories`, `collections`, `warehouses`, `shippingZones`, `products`, `menus`, `models`. See `designing-zod-schemas` skill and `src/modules/config/schema/schema.ts` for full schema details.

## Bulk Operations

Large operations are chunked (default: 50 items per chunk) to avoid timeouts. The GraphQL client handles HTTP 429 automatically with exponential backoff (max 5 retries).

## Diff & Comparison Logic

### Comparison Dimensions

For each entity type: **Existence** (does it exist remotely?), **Equality** (are fields equal?), **Children** (are nested structures equal?).

### Diff Result Types

Actions: `create`, `update`, `delete`, `unchanged`. Each entity has a dedicated comparator (e.g., `src/core/diff/comparators/category-comparator.ts`) that matches by slug or name.

## Common Patterns

### Adding a New Entity Type

1. Define Zod schema in `src/modules/config/schema/`
2. Create service in `src/modules/<entity>/`
3. Create repository with GraphQL operations
4. Add comparator in `src/core/diff/comparators/`
5. Add deployment stage in pipeline
6. Update schema documentation

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Wrong identification strategy | Check entity table: slug-based vs name-based |
| Creating entity before dependency | Follow deployment pipeline order |
| Missing chunking for bulk ops | Use `splitIntoChunks()` with default chunk size |
| Not handling rate limits | Use urql retry exchange (built-in) |

## References

For detailed information, see:
- `understanding-saleor-domain/references/entity-identification.md` - Complete entity identification rules
- `understanding-saleor-domain/references/deployment-stages.md` - Pipeline stage details
- `understanding-saleor-domain/references/schema-patterns.md` - YAML configuration patterns
- `docs/ENTITY_REFERENCE.md` - Full entity documentation
- `docs/ARCHITECTURE.md` - System architecture
- `src/modules/config/schema/schema.ts` - Zod schema definitions

## Related Skills

- **Implementing entities**: See `adding-entity-types` for complete implementation workflow
- **Config schemas**: See `designing-zod-schemas` for schema patterns
- **GraphQL operations**: See `writing-graphql-operations` for Saleor API integration

## Quick Reference Rules

For condensed quick references, see:
- `.claude/rules/entity-development.md` (automatically loaded when editing `src/modules/**/*.ts`)
- `.claude/rules/diff-engine.md` (automatically loaded when editing `src/core/diff/**/*.ts`)
