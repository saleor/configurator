---
description: Launch comprehensive configuration review agent for deep analysis and improvement suggestions
allowed-tools: Task
---

# Configurator Review

This command launches the `config-review` agent for comprehensive analysis of your Saleor configuration.

## When to Use

- Before deploying to production
- After making significant changes
- When troubleshooting configuration issues
- For periodic configuration audits

## What It Does

The config-review agent performs:

1. **Schema Validation**: Ensures all entities conform to Saleor's requirements
2. **Best Practice Analysis**: Checks for common anti-patterns
3. **Relationship Verification**: Validates all cross-entity references
4. **Performance Considerations**: Identifies potential performance issues
5. **Improvement Suggestions**: Recommends enhancements

## Usage

Simply invoke this command - it will launch the config-review agent:

```
/configurator-review
```

The agent will:
1. Read your config.yml
2. Analyze the configuration
3. Report findings by priority (Critical, Warning, Suggestion)
4. Provide actionable recommendations

## Agent Launch

Launch the config-review agent with the following task:

```
Perform a comprehensive review of the config.yml file in the current directory.

Review checklist:
1. Validate YAML syntax and schema compliance
2. Check all entity references are valid
3. Identify best practice violations
4. Look for common anti-patterns
5. Suggest improvements for maintainability
6. Check for potential deployment issues

Report findings organized by priority:
- Critical: Must fix before deployment
- Warning: Should address soon
- Suggestion: Nice to have improvements

For each finding, provide:
- What the issue is
- Why it matters
- How to fix it
- Line number reference if applicable
```

## Expected Output

The agent will provide a structured report:

```
═══════════════════════════════════════════════════
  Configuration Review Report
═══════════════════════════════════════════════════

CRITICAL (0)
  None found - configuration is deployment-ready

WARNINGS (2)
  1. Inactive channel "staging" still has products
     → Consider removing products or activating channel

  2. Product type "Legacy" has no products
     → Consider removing unused product type

SUGGESTIONS (3)
  1. Add SEO descriptions to products
  2. Consider grouping related categories
  3. Add collection for featured products

═══════════════════════════════════════════════════
  Overall Score: 8.5/10 - Good
  Recommendation: Address warnings before production
═══════════════════════════════════════════════════
```

## Alternative: Quick Validation

For faster validation without deep analysis, use:

```
/configurator-validate
```

This provides quicker feedback but less detailed analysis than the full review agent.
