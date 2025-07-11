/**
 * Commitlint configuration for conventional commits
 *
 * Enforces commit message format: type(scope): description
 *
 * Examples:
 * - feat: add new product import feature
 * - fix(api): resolve GraphQL timeout issue
 * - docs: update installation guide
 * - test(product): add unit tests for product service
 */

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of these
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation changes
        "style", // Code style changes (formatting, etc.)
        "refactor", // Code refactoring
        "test", // Adding or updating tests
        "chore", // Maintenance tasks
        "ci", // CI/CD changes
        "perf", // Performance improvements
        "build", // Build system changes
        "revert", // Reverting previous commits
      ],
    ],

    // Subject line rules
    "subject-case": [2, "never", ["pascal-case", "upper-case"]],
    "subject-max-length": [2, "always", 100],
    "subject-min-length": [2, "always", 10],
    "subject-empty": [2, "never"],

    // Body rules (optional but recommended for complex changes)
    "body-max-line-length": [1, "always", 100],

    // Footer rules (for breaking changes and issue references)
    "footer-max-line-length": [1, "always", 100],
  },
};
