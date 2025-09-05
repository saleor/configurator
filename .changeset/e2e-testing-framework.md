---
"@saleor/configurator": minor
---

feat: Add comprehensive E2E testing framework using Testcontainers

Implemented a robust end-to-end testing framework that runs the CLI against a real Saleor instance using Docker containers. This ensures the configurator works correctly in production-like scenarios with actual GraphQL APIs, database persistence, and the full deployment cycle.

Key features:
- Testcontainers integration for automated Docker container management
- Real Saleor instance (v3.20) with PostgreSQL and Redis
- Enhanced CLI runner using execa for process spawning
- Custom assertions for CLI output validation
- Smoke tests for quick validation
- GitHub Actions workflow for CI/CD integration
- Support for introspect → modify → deploy → deploy (idempotency) cycles

This significantly improves test coverage and confidence in the CLI's functionality.