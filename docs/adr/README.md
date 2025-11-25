# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the Saleor Configurator project.

## What is an ADR?

An Architecture Decision Record (ADR) captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:
- **Title**: Decision being made
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: Problem and background
- **Decision**: What we decided to do
- **Consequences**: Results of the decision (positive and negative)

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](./001-bulk-mutations-optimization.md) | Bulk Mutations Optimization with Chunked Processing | Accepted | 2025-11-12 |

## Quick Links

### By Topic

**Performance & Scalability**
- [ADR-001: Bulk Mutations Optimization](./001-bulk-mutations-optimization.md) - 95% faster deployments through bulk GraphQL operations

### By Status

**Accepted**
- [ADR-001: Bulk Mutations Optimization](./001-bulk-mutations-optimization.md)

## Contributing

When creating a new ADR:

1. Copy the template or use an existing ADR as reference
2. Use sequential numbering (e.g., 002, 003)
3. Use descriptive kebab-case filenames
4. Update this index file
5. Include date and status
6. Document alternatives considered
7. Be clear about tradeoffs

## Resources

- [ADR GitHub Organization](https://adr.github.io/)
- [Documenting Architecture Decisions by Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
