# Error Handling Architecture

**Deep dive into the error hierarchy, propagation patterns, and recovery system**

## Table of Contents

1. [Overview](#overview)
2. [Error Hierarchy](#error-hierarchy)
3. [BaseError Foundation](#baseerror-foundation)
4. [Module-Specific Errors](#module-specific-errors)
5. [GraphQL Errors](#graphql-errors)
6. [Zod Validation Errors](#zod-validation-errors)
7. [Deployment Errors](#deployment-errors)
8. [Error Recovery Guide](#error-recovery-guide)
9. [Error Propagation Patterns](#error-propagation-patterns)
10. [Error Formatting](#error-formatting)
11. [Best Practices](#best-practices)
12. [Serena Navigation](#serena-navigation)

---

## Overview

The **Error Handling Architecture** provides a structured, hierarchical system for handling errors across the configurator. It emphasizes **actionable suggestions**, **clear messaging**, and **graceful degradation**.

### Purpose

- **Structured Errors** - Consistent error hierarchy with error codes
- **Recovery Suggestions** - Actionable suggestions for users
- **Error Propagation** - Clean propagation from services → repositories → GraphQL
- **User-Friendly Messages** - Clear, helpful error messages
- **Exit Codes** - Appropriate exit codes for different error types

### Key Design Goals

1. **Clarity**: Users understand what went wrong
2. **Actionability**: Users know how to fix the problem
3. **Consistency**: All errors follow the same patterns
4. **Traceability**: Preserve stack traces and context
5. **Graceful Degradation**: Handle partial failures when possible

### File Structure

```
src/lib/errors/
├── shared.ts              # BaseError and common utilities
├── graphql.ts             # GraphQL-specific errors
├── zod.ts                 # Zod validation errors
└── recovery-guide.ts      # Error recovery suggestions

src/core/deployment/
└── errors.ts              # Deployment-specific errors

src/modules/*/
└── errors.ts              # Module-specific errors (Product, Category, etc.)
```

---

## Error Hierarchy

### Complete Hierarchy

```
Error (JavaScript built-in)
  ↓
BaseError (abstract base with error codes)
  ├── EnvironmentVariableError
  ├── GraphQLError
  │   └── GraphQLUnknownError
  ├── ZodValidationError
  │
  ├── Module Errors (per module)
  │   ├── ProductError
  │   │   ├── ProductNotFoundError
  │   │   ├── ProductCreationError
  │   │   ├── ProductUpdateError
  │   │   └── ProductVariantError
  │   ├── CategoryError
  │   │   ├── CategoryNotFoundError
  │   │   ├── CategoryCreationError
  │   │   └── CategoryUpdateError
  │   ├── ChannelError
  │   │   ├── ChannelNotFoundError
  │   │   ├── ChannelCreationError
  │   │   └── ChannelUpdateError
  │   └── ... (similar for all modules)
  │
  └── DeploymentError (abstract)
      ├── NetworkDeploymentError
      ├── AuthenticationDeploymentError
      ├── ValidationDeploymentError
      ├── StageAggregateError
      ├── PartialDeploymentError
      └── UnexpectedDeploymentError
```

### Error Code Patterns

**Module Errors:**
- `PRODUCT_ERROR` - Generic product error
- `PRODUCT_NOT_FOUND_ERROR` - Product not found
- `PRODUCT_CREATION_ERROR` - Failed to create product
- `PRODUCT_UPDATE_ERROR` - Failed to update product
- `PRODUCT_VARIANT_ERROR` - Variant-specific error

**GraphQL Errors:**
- `GRAPHQL_ERROR` - Generic GraphQL error

**Validation Errors:**
- `ZOD_VALIDATION_ERROR` - Schema validation failed

**Deployment Errors:**
- Use exit codes instead of error codes:
  - `EXIT_CODE_UNEXPECTED = 1` - Unexpected error
  - `EXIT_CODE_AUTHENTICATION = 2` - Auth error
  - `EXIT_CODE_NETWORK = 3` - Network error
  - `EXIT_CODE_VALIDATION = 4` - Validation error
  - `EXIT_CODE_PARTIAL_FAILURE = 5` - Partial failure

---

## BaseError Foundation

### BaseError Class

**Location:** `src/lib/errors/shared.ts:13-42`

```typescript
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverySuggestions?: string[]
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get recovery suggestions for this error
   * Can be overridden by subclasses for custom suggestions
   */
  getRecoverySuggestions(): string[] {
    if (this.recoverySuggestions && this.recoverySuggestions.length > 0) {
      return this.recoverySuggestions;
    }

    // Import dynamically to avoid circular dependency
    const { ErrorRecoveryGuide } = require("./recovery-guide");
    const suggestions = ErrorRecoveryGuide.getSuggestions(this.message);
    return ErrorRecoveryGuide.formatSuggestions(suggestions);
  }
}
```

**Key Features:**
1. **Error Code** - Machine-readable error identifier
2. **Recovery Suggestions** - Actionable suggestions for users
3. **Stack Trace** - Preserves JavaScript stack trace
4. **Name** - Set to constructor name for identification

### EnvironmentVariableError

**Location:** `src/lib/errors/shared.ts:44-48`

```typescript
export class EnvironmentVariableError extends BaseError {
  constructor(message: string) {
    super(message, "ENVIRONMENT_VARIABLE_ERROR");
  }
}
```

**Usage:**
```typescript
if (!process.env.SALEOR_API_URL) {
  throw new EnvironmentVariableError("SALEOR_API_URL environment variable is required");
}
```

---

## Module-Specific Errors

### Error Pattern (Per Module)

Each module follows this pattern:

```typescript
// Base error for the module
export class {Module}Error extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "{MODULE}_ERROR", recoverySuggestions);
  }
}

// Not found error
export class {Module}NotFoundError extends BaseError {
  constructor(entityName: string) {
    super(`{Module} "${entityName}" not found`, "{MODULE}_NOT_FOUND_ERROR");
  }
}

// Creation error
export class {Module}CreationError extends BaseError {
  constructor(message: string, _entityName?: string) {
    super(message, "{MODULE}_CREATION_ERROR");
  }
}

// Update error
export class {Module}UpdateError extends BaseError {
  constructor(message: string, _entityId?: string) {
    super(message, "{MODULE}_UPDATE_ERROR");
  }
}
```

### ProductError Example

**Location:** `src/modules/product/errors.ts:6-62`

```typescript
export class ProductError extends BaseError {
  constructor(message: string, entityIdentifierOrCode?: string, recoverySuggestions?: string[]) {
    if (recoverySuggestions !== undefined) {
      // Full BaseError pattern
      super(message, entityIdentifierOrCode || "PRODUCT_ERROR", recoverySuggestions);
    } else {
      // ServiceErrorWrapper pattern
      super(message, "PRODUCT_ERROR");
    }
  }
}

export class ProductNotFoundError extends ProductError {
  constructor(productName: string) {
    super(`Product "${productName}" not found`, "PRODUCT_NOT_FOUND_ERROR");
  }
}

export class ProductCreationError extends ProductError {
  constructor(
    message: string,
    public readonly productName?: string
  ) {
    super(message, "PRODUCT_CREATION_ERROR");
  }
}

export class ProductUpdateError extends ProductError {
  constructor(
    message: string,
    public readonly productId?: string
  ) {
    super(message, "PRODUCT_UPDATE_ERROR");
  }
}

export class ProductVariantError extends ProductError {
  constructor(
    message: string,
    public readonly variantSku?: string
  ) {
    super(message, "PRODUCT_VARIANT_ERROR");
  }
}
```

### CategoryError Example

**Location:** `src/modules/category/errors.ts:6-37`

```typescript
export class CategoryError extends BaseError {
  constructor(message: string, recoverySuggestions?: string[]) {
    super(message, "CATEGORY_ERROR", recoverySuggestions);
  }
}

export class CategoryNotFoundError extends BaseError {
  constructor(categoryName: string) {
    super(`Category "${categoryName}" not found`, "CATEGORY_NOT_FOUND_ERROR");
  }
}

export class CategoryCreationError extends BaseError {
  constructor(message: string, _categoryName?: string) {
    super(message, "CATEGORY_CREATION_ERROR");
  }
}

export class CategoryUpdateError extends BaseError {
  constructor(message: string, _categoryId?: string) {
    super(message, "CATEGORY_UPDATE_ERROR");
  }
}
```

### All Module Errors

Each of these modules has a similar error hierarchy:
- `product/errors.ts` - Product, ProductNotFound, ProductCreation, ProductUpdate, ProductVariant
- `category/errors.ts` - Category, CategoryNotFound, CategoryCreation, CategoryUpdate
- `channel/errors.ts` - Channel, ChannelNotFound, ChannelCreation, ChannelUpdate
- `collection/errors.ts` - Collection, CollectionNotFound, CollectionCreation, CollectionUpdate
- `menu/errors.ts` - Menu, MenuNotFound, MenuCreation, MenuUpdate
- `model/errors.ts` - Model, ModelNotFound, ModelCreation, ModelUpdate
- `attribute/errors.ts` - Attribute, AttributeNotFound, AttributeCreation, AttributeUpdate
- `product-type/errors.ts` - ProductType, ProductTypeNotFound, ProductTypeCreation, ProductTypeUpdate
- `page-type/errors.ts` - PageType, PageTypeNotFound, PageTypeCreation, PageTypeUpdate
- `warehouse/errors.ts` - Warehouse, WarehouseNotFound, WarehouseCreation, WarehouseUpdate
- `shipping-zone/errors.ts` - ShippingZone, ShippingZoneNotFound, ShippingZoneCreation, ShippingZoneUpdate
- `tax/errors.ts` - Tax, TaxNotFound, TaxCreation, TaxUpdate
- `shop/errors.ts` - Shop, ShopUpdate
- `config/errors.ts` - Config, ConfigLoad, ConfigValidation

---

## GraphQL Errors

### GraphQLError Class

**Location:** `src/lib/errors/graphql.ts:33-273`

```typescript
export class GraphQLError extends BaseError {
  constructor(message: string) {
    super(message, "GRAPHQL_ERROR");
  }

  /**
   * Creates a GraphQLError with automatically formatted GraphQL error messages
   */
  static fromGraphQLErrors(errors: CombinedError["graphQLErrors"], message?: string): GraphQLError {
    const formattedErrors = errors.map((error) => {
      let errorMessage = error.message;

      if (error.locations) {
        const locations = error.locations.map((loc) => `${loc.line}:${loc.column}`).join(", ");
        errorMessage += ` at ${locations}`;
      }

      if (error.path) {
        errorMessage += ` (path: ${error.path.join(".")})`;
      }

      return errorMessage;
    });

    const combinedMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      `GraphQL errors: ${formattedErrors.join("; ")}`
    );

    return new GraphQLError(combinedMessage);
  }

  static fromDataErrors(
    message: string,
    errors: Array<{
      message: string | null | undefined;
      field?: string | null | undefined;
      code?: string | null | undefined;
    }>
  ): GraphQLError {
    if (!errors.length) {
      return new GraphQLError("Unknown GraphQL data error");
    }

    const formatted = errors.map((e) => {
      let msg = e.message ?? "Unknown error";
      if (e.field) msg = `[${e.field}] ${msg}`;
      if (e.code) msg += ` (code: ${e.code})`;
      return msg;
    });

    const combinedMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      formatted.join("; ")
    );
    return new GraphQLError(combinedMessage);
  }

  /**
   * Creates a GraphQLError with smart error detection and helpful messages
   */
  static fromCombinedError(message: string, error: CombinedError): GraphQLError {
    logger.error("GraphQL error", { error });

    // Check for rate limiting (429)
    if (error.response?.status === 429) {
      return new GraphQLError(
        `${message}: Rate Limited (429)\n\n` +
          `The API is rate limiting your requests.\n` +
          `💡 Wait a few moments and try again, or reduce concurrent operations`
      );
    }

    // Check for specific network error types
    if (GraphQLError.isForbiddenError(error)) {
      // Extract required permissions
      const requiredPermissions = new Set<string>();
      if (error.graphQLErrors) {
        error.graphQLErrors.forEach((graphQLError) => {
          const match = graphQLError.message.match(
            /need one of the following permissions: ([^,]+(?:, [^,]+)*)/
          );
          if (match) {
            match[1].split(", ").forEach((perm) => requiredPermissions.add(perm.trim()));
          }
        });
      }

      const permissionList =
        requiredPermissions.size > 0
          ? `\n\nRequired permissions: ${Array.from(requiredPermissions).join(", ")}`
          : "";

      return new GraphQLError(
        `${message}: Permission Denied\n\n` +
          `💡 Generate a new token with the required permissions${permissionList}`
      );
    }

    if (GraphQLError.isNotFoundError(error)) {
      return new GraphQLError(
        `${message}: Not Found (404)\n\n` +
          `Expected format: https://your-store.saleor.cloud/graphql/\n` +
          `💡 Check your URL and ensure it ends with /graphql/`
      );
    }

    if (GraphQLError.isUnauthorizedError(error)) {
      return new GraphQLError(
        `${message}: Unauthorized (401)\n\n` +
          `💡 Check your token and regenerate it if necessary`
      );
    }

    // Handle GraphQL errors
    if (error.graphQLErrors?.length) {
      return GraphQLError.fromGraphQLErrors(error.graphQLErrors, message);
    }

    // Fallback for other errors
    return new GraphQLError(`${message}: ${error.message}`);
  }

  // Error type checkers
  static isForbiddenError(error: CombinedError): boolean;
  static isNotFoundError(error: CombinedError): boolean;
  static isConnectionError(error: CombinedError): boolean;
  static isUnauthorizedError(error: CombinedError): boolean;
}
```

### GraphQL Error Detection

**403 Forbidden:**
```typescript
static isForbiddenError(error: CombinedError): boolean {
  if (error.graphQLErrors) {
    const hasPermissionError = error.graphQLErrors.some((graphQLError) => {
      const exceptionCode = graphQLError.extensions?.exception?.code;
      return (
        exceptionCode === "PermissionDenied" ||
        graphQLError.message.includes("need one of the following permissions")
      );
    });
    if (hasPermissionError) return true;
  }

  const message = error.message?.toLowerCase() || "";
  return message.includes("forbidden") || message.includes("403");
}
```

**404 Not Found:**
```typescript
static isNotFoundError(error: CombinedError): boolean {
  if (error.response?.status === 404) {
    return true;
  }

  if (error.networkError?.status === 404) {
    return true;
  }

  const message = error.message?.toLowerCase() || "";
  return message.includes("404") && message.includes("[network]");
}
```

**401 Unauthorized:**
```typescript
static isUnauthorizedError(error: CombinedError): boolean {
  if (error.response?.status === 401) {
    return true;
  }

  if (error.networkError?.status === 401) {
    return true;
  }

  const message = error.message?.toLowerCase() || "";
  return message.includes("unauthorized") || message.includes("401");
}
```

**Connection Errors:**
```typescript
static isConnectionError(error: CombinedError): boolean {
  if (!error.networkError) return false;

  if (error.networkError.code) {
    const code = error.networkError.code.toUpperCase();
    if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
      return true;
    }
  }

  const message = error.message?.toLowerCase() || "";
  return (
    message.includes("[network]") &&
    (message.includes("enotfound") ||
      message.includes("econnrefused") ||
      message.includes("connection"))
  );
}
```

---

## Zod Validation Errors

### ZodValidationError Class

**Location:** `src/lib/errors/zod.ts:4-22`

```typescript
export class ZodValidationError extends BaseError {
  constructor(message: string) {
    super(message, "ZOD_VALIDATION_ERROR");
  }

  static fromZodError(error: z.ZodError, message?: string): ZodValidationError {
    const formattedErrors = error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      const errorMessage = formatZodIssue(issue);
      return path === "root" ? errorMessage : `${path}: ${errorMessage}`;
    });

    const fullMessage = errorFormatHelpers.formatGenericErrorMessage(
      message,
      formattedErrors.join("; ")
    );
    return new ZodValidationError(fullMessage);
  }
}
```

### Zod Issue Formatting

**Location:** `src/lib/errors/zod.ts:24-91`

Provides user-friendly messages for common Zod validation errors:

```typescript
function formatZodIssue(issue: z.ZodIssue): string {
  const message = issue.message;

  // Customize common error patterns
  if (message.includes("Invalid email")) {
    return "Must be a valid email address";
  }
  if (message.includes("Invalid url")) {
    return "Must be a valid URL";
  }
  if (message.includes("Too small") && message.includes("string")) {
    const min = extractMin(message);
    return `Must be at least ${min} character${min === 1 ? "" : "s"} long`;
  }
  if (message.includes("Too small") && message.includes("array")) {
    const min = extractMin(message);
    return `Must contain at least ${min} item${min === 1 ? "" : "s"}`;
  }
  if (message.includes("Invalid option")) {
    const options = extractOptions(message);
    return `Must be one of: ${options}`;
  }
  
  return message;
}
```

**Example Output:**
```
Configuration validation failed:
- products.0.name: Must be at least 1 character long
- products.0.productType: Must be one of: T-Shirt, Mug, Book
- products.1.channelListings.0.price: Expected number, but received string
```

---

## Deployment Errors

### DeploymentError Abstract Class

**Location:** `src/core/deployment/errors.ts:18-72`

```typescript
export abstract class DeploymentError extends Error {
  constructor(
    message: string,
    public readonly suggestions: readonly string[],
    public readonly context?: Record<string, unknown>,
    public readonly originalError?: Error | unknown
  ) {
    super(message);
    this.name = this.constructor.name;

    // Preserve stack trace from original error
    if (originalError instanceof Error && originalError.stack) {
      this.stack = originalError.stack;
    }
  }

  abstract getExitCode(): number;
  abstract getErrorType(): string;

  getUserMessage(verbose = false): string {
    const lines: string[] = [
      `❌ Deployment failed: ${this.getErrorType()}`,
      "",
      this.message
    ];

    if (this.context && Object.keys(this.context).length > 0) {
      lines.push("", "Details:");
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`  • ${key}: ${value}`);
      }
    }

    if (this.suggestions.length > 0) {
      lines.push("", "Suggested actions:");
      this.suggestions.forEach((suggestion, index) => {
        lines.push(`  ${index + 1}. ${suggestion}`);
      });
    }

    if (verbose && this.originalError) {
      lines.push("", "Original error:", String(this.originalError));
    } else if (!verbose) {
      lines.push("", "For more details, run with --verbose flag.");
    }

    return lines.join("\n");
  }
}
```

### Exit Codes

**Location:** `src/core/deployment/errors.ts:6-12`

```typescript
export const EXIT_CODES = {
  UNEXPECTED: 1,
  AUTHENTICATION: 2,
  NETWORK: 3,
  VALIDATION: 4,
  PARTIAL_FAILURE: 5,
} as const;
```

### Deployment Error Types

#### NetworkDeploymentError

```typescript
export class NetworkDeploymentError extends DeploymentError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
    const suggestions = [
      "Check your internet connection",
      "Verify the Saleor instance URL is correct",
      "Ensure the Saleor instance is running and accessible",
      "Check if you're behind a proxy or firewall",
    ];

    super(message, suggestions, context, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.NETWORK;
  }

  protected getErrorType(): string {
    return "Network Error";
  }
}
```

#### AuthenticationDeploymentError

```typescript
export class AuthenticationDeploymentError extends DeploymentError {
  constructor(message: string, context?: Record<string, unknown>, originalError?: Error) {
    const suggestions = [
      "Verify your API token is correct: --token YOUR_TOKEN",
      "Check token permissions in Saleor dashboard",
      "Generate a new token if the current one is expired",
      "Ensure the token has the required permissions for this operation",
    ];

    super(message, suggestions, context, originalError);
  }

  getExitCode(): number {
    return EXIT_CODES.AUTHENTICATION;
  }

  protected getErrorType(): string {
    return "Authentication Error";
  }
}
```

#### StageAggregateError (Partial Failure)

```typescript
export class StageAggregateError extends DeploymentError {
  constructor(
    stageName: string,
    public readonly failures: Array<{
      entity: string;
      error: Error;
    }>,
    public readonly successes: string[] = []
  ) {
    const summary = `${stageName} failed for ${failures.length} of ${failures.length + successes.length} entities`;

    const suggestions = [
      "Review the individual errors below",
      "Fix the issues and run deploy again",
      "Use --include flag to deploy only specific entities",
      "Run 'saleor-configurator diff' to check current state",
    ];

    super(summary, suggestions, {
      stageName,
      totalEntities: failures.length + successes.length,
      failedCount: failures.length,
      successCount: successes.length,
    });
  }

  getExitCode(): number {
    return EXIT_CODES.PARTIAL_FAILURE;
  }

  getUserMessage(verbose = false): string {
    const lines: string[] = [
      `❌ ${this.context?.stageName} - ${this.failures.length} of ${
        this.failures.length + this.successes.length
      } failed`,
      "",
    ];

    // Show successes
    if (this.successes.length > 0) {
      lines.push("✅ Successful:");
      this.successes.forEach((entity) => {
        lines.push(`  • ${entity}`);
      });
      lines.push("");
    }

    // Show failures with recovery suggestions
    if (this.failures.length > 0) {
      lines.push("❌ Failed:");
      this.failures.forEach(({ entity, error }) => {
        lines.push(`  • ${entity}`);
        lines.push(`    Error: ${error.message}`);

        // Get recovery suggestions for this specific error
        const suggestions = ErrorRecoveryGuide.getSuggestions(error.message);
        const formattedSuggestions = ErrorRecoveryGuide.formatSuggestions(suggestions);

        if (formattedSuggestions.length > 0) {
          formattedSuggestions.forEach((suggestion) => {
            lines.push(`    ${suggestion}`);
          });
        }

        lines.push("");
      });
    }

    return lines.join("\n");
  }
}
```

---

## Error Recovery Guide

### ErrorRecoveryGuide System

**Location:** `src/lib/errors/recovery-guide.ts`

**Purpose:** Pattern-based error matching with actionable recovery suggestions.

### RecoverySuggestion Interface

```typescript
export interface RecoverySuggestion {
  fix: string;      // What to do
  check?: string;   // How to verify
  command?: string; // Command to run
}
```

### Pattern Registry

```typescript
const patterns: Map<RegExp, (match: RegExpMatchArray) => RecoverySuggestion> = new Map([
  // Attribute errors
  [
    /Entity type is required for reference attribute ['"]?([^'"]+)['"]?/i,
    (match) => ({
      fix: `Add entityType field to the '${match[1]}' reference attribute in your config`,
      check: "Valid values are: PAGE, PRODUCT, or PRODUCT_VARIANT",
      command: "saleor-configurator diff --include=attributes",
    }),
  ],
  [
    /Attribute ['"]?([^'"]+)['"]? not found/i,
    (match) => ({
      fix: `Create the attribute '${match[1]}' first or reference an existing one`,
      check: "View available attributes",
      command: "saleor-configurator introspect --include=attributes",
    }),
  ],

  // Entity not found errors
  [
    /Category ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Ensure category '${match[1]}' exists or will be created earlier in deployment`,
      check: "View existing categories",
      command: "saleor-configurator introspect --include=categories",
    }),
  ],
  [
    /Product type ['"]?(.+?)['"]? not found/i,
    (match) => ({
      fix: `Create the product type '${match[1]}' in the productTypes section first`,
      check: "View existing product types",
      command: "saleor-configurator introspect --include=productTypes",
    }),
  ],

  // Duplicate entity errors
  [
    /Duplicate.*['"]?(.+?)['"]?.*found/i,
    (match) => ({
      fix: `Remove duplicate '${match[1]}' from your configuration`,
      check: "Search for the duplicate entity name",
      command: "saleor-configurator diff --verbose",
    }),
  ],

  // Permission errors
  [
    /Permission denied|You do not have permission/i,
    () => ({
      fix: "Check your Saleor API token has the required permissions",
      check: "Ensure you have admin permissions for the operations you're trying to perform",
      command: "saleor-configurator introspect --include=shop",
    }),
  ],

  // Network errors
  [
    /Network error|Connection failed|ECONNREFUSED/i,
    () => ({
      fix: "Check your Saleor API URL and network connection",
      check: "Verify the SALEOR_API_URL environment variable is correct",
    }),
  ],
]);
```

### Error Matching and Formatting

```typescript
export class ErrorRecoveryGuide {
  static getSuggestions(errorMessage: string): RecoverySuggestion[] {
    const suggestions: RecoverySuggestion[] = [];

    for (const [pattern, suggestionFn] of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        suggestions.push(suggestionFn(match));
      }
    }

    return suggestions;
  }

  static formatSuggestions(suggestions: RecoverySuggestion[]): string[] {
    return suggestions.map((suggestion) => {
      const parts: string[] = [`💡 ${suggestion.fix}`];
      
      if (suggestion.check) {
        parts.push(`   ✓ ${suggestion.check}`);
      }
      
      if (suggestion.command) {
        parts.push(`   $ ${suggestion.command}`);
      }
      
      return parts.join("\n");
    });
  }
}
```

**Example Output:**
```
❌ Failed to deploy product "T-Shirt"
   Error: Product type "Apparel" not found

💡 Create the product type 'Apparel' in the productTypes section first
   ✓ View existing product types
   $ saleor-configurator introspect --include=productTypes
```

---

## Error Propagation Patterns

### Pattern 1: Repository → Service

**Repository Level (Catch GraphQL errors):**
```typescript
async getProduct(slug: string): Promise<Product> {
  const result = await this.client.query(getProductQuery, { slug });

  // Check URQL errors
  if (result.error) {
    throw GraphQLError.fromCombinedError(
      `Failed to fetch product "${slug}"`,
      result.error
    );
  }

  // Check Saleor business errors
  if (!result.data?.product) {
    throw new ProductNotFoundError(slug);
  }

  return result.data.product;
}
```

**Service Level (Wrap with context):**
```typescript
async bootstrapProduct(product: ProductInput): Promise<void> {
  try {
    const existing = await this.repository.getProduct(product.slug);
    if (existing) {
      await this.updateProduct(product, existing);
    } else {
      await this.createProduct(product);
    }
  } catch (error) {
    if (error instanceof ProductNotFoundError) {
      // Expected error, create product
      await this.createProduct(product);
    } else {
      // Unexpected error, wrap with context
      throw new ProductError(
        `Failed to bootstrap product "${product.name}": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}
```

### Pattern 2: Stage Execution (Aggregate Errors)

**Stage Level (Collect failures):**
```typescript
async execute(context: DeploymentContext): Promise<void> {
  const config = await context.configurator.services.configStorage.load();
  
  const results = await Promise.allSettled(
    config.products.map((product) =>
      context.configurator.services.product
        .bootstrapProduct(product)
        .then(() => ({ name: product.name, success: true }))
        .catch((error) => ({
          name: product.name,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
    )
  );

  const successes = results
    .filter((r): r is PromiseFulfilledResult<{ name: string; success: true }> =>
      r.status === "fulfilled" && r.value.success === true
    )
    .map((r) => r.value.name);

  const failures = results
    .filter((r): r is PromiseFulfilledResult<{ name: string; success: false; error: Error }> =>
      r.status === "fulfilled" && r.value.success === false
    )
    .map((r) => ({ entity: r.value.name, error: r.value.error }));

  if (failures.length > 0) {
    throw new StageAggregateError("Managing products", failures, successes);
  }
}
```

### Pattern 3: CLI Level (Convert to User Message)

**CLI Level (Format for user):**
```typescript
try {
  await pipeline.execute(context);
  console.log("✅ Deployment completed successfully");
} catch (error) {
  if (error instanceof DeploymentError) {
    console.error(error.getUserMessage(args.verbose));
    process.exit(error.getExitCode());
  } else {
    const deploymentError = toDeploymentError(error);
    console.error(deploymentError.getUserMessage(args.verbose));
    process.exit(deploymentError.getExitCode());
  }
}
```

---

## Error Formatting

### Format Helper

**Location:** `src/lib/errors/shared.ts:1-11`

```typescript
function formatGenericErrorMessage(message: string | undefined, error: string): string {
  if (!message) {
    return error;
  }

  return `${message}. ${error}`;
}

export const errorFormatHelpers = {
  formatGenericErrorMessage,
};
```

**Usage:**
```typescript
const message = errorFormatHelpers.formatGenericErrorMessage(
  "Failed to create product",
  "Product type not found"
);
// Result: "Failed to create product. Product type not found"
```

### GraphQL Error Formatting

**Location:** `src/lib/errors/graphql.ts:41-63`

```typescript
static fromGraphQLErrors(errors: CombinedError["graphQLErrors"], message?: string): GraphQLError {
  const formattedErrors = errors.map((error) => {
    let errorMessage = error.message;

    // Add location information
    if (error.locations) {
      const locations = error.locations.map((loc) => `${loc.line}:${loc.column}`).join(", ");
      errorMessage += ` at ${locations}`;
    }

    // Add path information
    if (error.path) {
      errorMessage += ` (path: ${error.path.join(".")})`;
    }

    return errorMessage;
  });

  const combinedMessage = errorFormatHelpers.formatGenericErrorMessage(
    message,
    `GraphQL errors: ${formattedErrors.join("; ")}`
  );

  return new GraphQLError(combinedMessage);
}
```

**Example:**
```
Failed to create product. GraphQL errors: 
  - Field 'productType' is required at 5:10 (path: productCreate.input.productType); 
  - Invalid price value at 8:15 (path: productCreate.input.price)
```

---

## Best Practices

### 1. Always Extend BaseError

```typescript
// DON'T do this:
export class MyError extends Error {
  constructor(message: string) {
    super(message);
  }
}

// DO this:
export class MyError extends BaseError {
  constructor(message: string) {
    super(message, "MY_ERROR");
  }
}
```

**Why:** Consistent error codes and recovery suggestions.

### 2. Provide Recovery Suggestions

```typescript
// DON'T do this:
throw new ProductError("Product type not found");

// DO this:
throw new ProductError(
  "Product type not found",
  "PRODUCT_ERROR",
  [
    "Create the product type in the productTypes section first",
    "View existing product types: saleor-configurator introspect --include=productTypes"
  ]
);
```

**Why:** Users need to know how to fix the problem.

### 3. Preserve Stack Traces

```typescript
try {
  await someOperation();
} catch (error) {
  // DON'T do this (loses stack trace):
  throw new MyError("Operation failed");

  // DO this (preserves original error):
  throw new MyError(
    `Operation failed: ${error instanceof Error ? error.message : String(error)}`
  );
}
```

**Why:** Debugging requires stack traces.

### 4. Use Specific Error Types

```typescript
// DON'T do this:
throw new Error("Product not found");

// DO this:
throw new ProductNotFoundError(productName);
```

**Why:** Specific errors can be caught and handled appropriately.

### 5. Wrap Errors with Context

```typescript
try {
  await this.repository.getProduct(slug);
} catch (error) {
  // Wrap with context
  throw new ProductError(
    `Failed to fetch product "${slug}": ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}
```

**Why:** Adds context about what operation failed.

### 6. Use GraphQLError Helpers

```typescript
// DON'T do this:
if (result.error) {
  throw new Error(result.error.message);
}

// DO this:
if (result.error) {
  throw GraphQLError.fromCombinedError(
    "Failed to create product",
    result.error
  );
}
```

**Why:** Smart error detection and user-friendly messages.

### 7. Handle Partial Failures

```typescript
// Use Promise.allSettled for batch operations
const results = await Promise.allSettled(
  entities.map((entity) => service.deploy(entity))
);

// Separate successes and failures
const failures = results
  .filter((r) => r.status === "rejected")
  .map((r) => ({ entity, error: r.reason }));

if (failures.length > 0) {
  throw new StageAggregateError("Stage name", failures, successes);
}
```

**Why:** Provides visibility into partial successes.

### 8. Use Exit Codes Appropriately

```typescript
export const EXIT_CODES = {
  UNEXPECTED: 1,        // Unknown errors
  AUTHENTICATION: 2,    // Auth failures
  NETWORK: 3,           // Connection issues
  VALIDATION: 4,        // Config errors
  PARTIAL_FAILURE: 5,   // Some operations failed
} as const;
```

**Why:** Allows scripts to detect error types.

### 9. Log Errors Before Throwing

```typescript
try {
  await operation();
} catch (error) {
  logger.error("Operation failed", { error, context });
  throw new MyError("Operation failed");
}
```

**Why:** Provides debugging information in logs.

### 10. Test Error Handling

```typescript
describe("ProductService", () => {
  it("should throw ProductNotFoundError when product doesn't exist", async () => {
    await expect(service.getProduct("nonexistent")).rejects.toThrow(
      ProductNotFoundError
    );
  });

  it("should wrap GraphQL errors", async () => {
    // Mock GraphQL error
    await expect(service.createProduct(input)).rejects.toThrow(
      GraphQLError
    );
  });
});
```

**Why:** Ensures error handling works correctly.

---

## Serena Navigation

### Finding Error Classes

**List all error files:**
```bash
find_file("*error*.ts", "src")
```

**Get error classes in a module:**
```bash
get_symbols_overview("src/modules/product/errors.ts")
```

**Result:**
```
- ProductError
- ProductNotFoundError
- ProductCreationError
- ProductUpdateError
- ProductVariantError
```

**Read specific error class:**
```bash
find_symbol("ProductError", include_body=True, relative_path="src/modules/product")
```

### Finding Error Usage

**Find where error is thrown:**
```bash
search_for_pattern("throw new ProductError", relative_path="src/modules/product")
```

**Find where error is caught:**
```bash
search_for_pattern("catch.*ProductError", relative_path="src")
```

### Finding Error Recovery Patterns

**Find recovery guide patterns:**
```bash
get_symbols_overview("src/lib/errors/recovery-guide.ts")
```

**Search for error suggestions:**
```bash
search_for_pattern("recoverySuggestions", relative_path="src")
```

---

## Summary

The Error Handling Architecture provides:

1. **Structured Hierarchy** - BaseError → Module Errors → Specific Errors
2. **Error Codes** - Machine-readable error identifiers
3. **Recovery Suggestions** - Actionable suggestions for users
4. **GraphQL Integration** - Smart detection and formatting
5. **Zod Validation** - User-friendly validation messages
6. **Deployment Errors** - Partial failure handling and exit codes
7. **Error Recovery Guide** - Pattern-based suggestions
8. **Propagation Patterns** - Clean error flow through layers

**Key Components:**
- BaseError (foundation with error codes)
- Module-specific errors (Product, Category, etc.)
- GraphQLError (URQL integration)
- ZodValidationError (schema validation)
- DeploymentError (deployment-specific)
- ErrorRecoveryGuide (pattern matching)

**For Serena Navigation:**
- Use `get_symbols_overview()` to see error classes
- Use `find_symbol()` to read specific errors
- Use `search_for_pattern()` to find error usage
- Read selectively for error propagation patterns

This architecture ensures users receive clear, actionable error messages with recovery suggestions throughout the configurator.