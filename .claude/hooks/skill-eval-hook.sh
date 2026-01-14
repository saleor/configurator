#!/bin/bash
# Forced Skill Evaluation Hook
# Research shows this achieves ~84% skill activation vs ~20% without
# Source: https://scottspence.com/posts/how-to-make-claude-code-skills-activate-reliably

cat << 'SKILL_EVAL'

## Skill Evaluation (Before Implementation)

Before starting implementation work, evaluate which skills apply:

**Step 1 - EVALUATE:** For each skill, state YES/NO:
- `reviewing-typescript-code` - YES if: writing/modifying TypeScript code
- `writing-graphql-operations` - YES if: creating/modifying GraphQL queries/mutations
- `analyzing-test-coverage` - YES if: writing/modifying tests
- `designing-zod-schemas` - YES if: creating/modifying validation schemas
- `implementing-cli-patterns` - YES if: working on CLI output/prompts
- `understanding-saleor-domain` - YES if: working with Saleor entities
- `adding-entity-types` - YES if: implementing new entity support
- `validating-pre-commit` - YES if: preparing to commit/push
- `creating-changesets` - YES if: preparing a release
- `managing-github-ci` - YES if: working on CI/CD workflows

**Step 2 - ACTIVATE:** Invoke the Skill tool for each YES skill.

**Step 3 - IMPLEMENT:** Proceed with implementation after skill activation.

SKILL_EVAL
