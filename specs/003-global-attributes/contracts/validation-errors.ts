/**
 * Contract: Validation Error Types for Global Attributes
 *
 * These error classes provide clear, actionable messages when users
 * have configuration issues related to attributes.
 */

// ============================================================================
// INLINE ATTRIBUTE ERROR
// ============================================================================

/**
 * Error thrown when a productType or modelType contains inline attribute definitions
 * instead of references to global productAttributes/contentAttributes sections.
 *
 * @example
 * // User has this in their config:
 * productTypes:
 *   - name: Book
 *     productAttributes:
 *       - name: Publisher      # INLINE - this is the error
 *         inputType: PLAIN_TEXT
 *
 * // Should be:
 * productAttributes:
 *   - name: Publisher
 *     inputType: PLAIN_TEXT
 *
 * productTypes:
 *   - name: Book
 *     productAttributes:
 *       - attribute: Publisher  # REFERENCE - correct
 */
export interface InlineAttributeErrorContext {
  /** The entity type containing inline definitions (productTypes or modelTypes) */
  entityType: "productTypes" | "modelTypes";

  /** Name of the specific entity (e.g., "Book") */
  entityName: string;

  /** Names of attributes that are defined inline */
  inlineAttributeNames: readonly string[];

  /** The section where attributes should be defined */
  expectedSection: "productAttributes" | "contentAttributes";
}

/**
 * Error message template for InlineAttributeError
 */
export function formatInlineAttributeError(ctx: InlineAttributeErrorContext): string {
  const attrList = ctx.inlineAttributeNames.join(", ");
  return (
    `${ctx.entityType} "${ctx.entityName}" contains inline attribute definitions: ${attrList}. ` +
    `Inline attribute definitions are no longer supported.`
  );
}

/**
 * Suggestions for resolving InlineAttributeError
 */
export function getInlineAttributeSuggestions(ctx: InlineAttributeErrorContext): readonly string[] {
  return [
    `Run 'saleor-configurator introspect' to generate YAML in the correct format`,
    `Move attribute definitions to the '${ctx.expectedSection}' section`,
    `Use '{ attribute: "Name" }' references in ${ctx.entityType}`,
  ];
}

// ============================================================================
// ATTRIBUTE NOT FOUND ERROR
// ============================================================================

/**
 * Error thrown when an attribute reference cannot be resolved because
 * the attribute doesn't exist in the expected section.
 *
 * @example
 * // User references an attribute that doesn't exist:
 * productTypes:
 *   - name: Book
 *     productAttributes:
 *       - attribute: Publsher  # TYPO - "Publisher" not found
 */
export interface AttributeNotFoundErrorContext {
  /** The attribute name that was referenced but not found */
  attributeName: string;

  /** The section where the attribute was expected */
  expectedSection: "productAttributes" | "contentAttributes";

  /** The entity that contains the reference */
  referencingEntity: {
    type: "productTypes" | "modelTypes";
    name: string;
  };

  /** Similar attribute names for "did you mean" suggestions */
  similarNames?: readonly string[];
}

/**
 * Error message template for AttributeNotFoundError
 */
export function formatAttributeNotFoundError(ctx: AttributeNotFoundErrorContext): string {
  return (
    `${ctx.referencingEntity.type} "${ctx.referencingEntity.name}" references attribute ` +
    `"${ctx.attributeName}" which does not exist in ${ctx.expectedSection}.`
  );
}

/**
 * Suggestions for resolving AttributeNotFoundError
 */
export function getAttributeNotFoundSuggestions(
  ctx: AttributeNotFoundErrorContext
): readonly string[] {
  const suggestions: string[] = [];

  // Did you mean?
  if (ctx.similarNames && ctx.similarNames.length > 0) {
    const similar = ctx.similarNames.slice(0, 3).join("', '");
    suggestions.push(`Did you mean: '${similar}'?`);
  }

  suggestions.push(
    `Add "${ctx.attributeName}" to the ${ctx.expectedSection} section`,
    `Check for typos in the attribute name`,
    `Run 'saleor-configurator introspect' to see existing attributes`
  );

  return suggestions;
}

// ============================================================================
// WRONG ATTRIBUTE TYPE ERROR
// ============================================================================

/**
 * Error thrown when an attribute exists but in the wrong section.
 *
 * @example
 * // User has "Author" in contentAttributes but references it in productTypes:
 * contentAttributes:
 *   - name: Author
 *     inputType: PLAIN_TEXT
 *
 * productTypes:
 *   - name: Book
 *     productAttributes:
 *       - attribute: Author  # ERROR - Author is a content attribute, not product
 */
export interface WrongAttributeTypeErrorContext {
  /** The attribute name that was referenced */
  attributeName: string;

  /** The section where the attribute was found */
  foundInSection: "productAttributes" | "contentAttributes";

  /** The section where the attribute was expected (based on usage) */
  expectedSection: "productAttributes" | "contentAttributes";

  /** The entity that contains the incorrect reference */
  referencingEntity: {
    type: "productTypes" | "modelTypes";
    name: string;
  };
}

/**
 * Error message template for WrongAttributeTypeError
 */
export function formatWrongAttributeTypeError(ctx: WrongAttributeTypeErrorContext): string {
  const foundType = ctx.foundInSection === "productAttributes" ? "product" : "content";
  const expectedType = ctx.expectedSection === "productAttributes" ? "product" : "content";

  return (
    `${ctx.referencingEntity.type} "${ctx.referencingEntity.name}" references attribute ` +
    `"${ctx.attributeName}" which exists but is a ${foundType} attribute, not a ${expectedType} attribute.`
  );
}

/**
 * Suggestions for resolving WrongAttributeTypeError
 */
export function getWrongAttributeTypeSuggestions(
  ctx: WrongAttributeTypeErrorContext
): readonly string[] {
  return [
    `Move "${ctx.attributeName}" from ${ctx.foundInSection} to ${ctx.expectedSection}`,
    `Create a separate attribute with this name in ${ctx.expectedSection}`,
    `Use a different attribute that exists in ${ctx.expectedSection}`,
  ];
}

// ============================================================================
// DUPLICATE ATTRIBUTE ERROR
// ============================================================================

/**
 * Error thrown when multiple attributes with the same name exist
 * within a section (productAttributes or contentAttributes).
 */
export interface DuplicateAttributeErrorContext {
  /** The duplicate attribute name */
  attributeName: string;

  /** The section containing the duplicate */
  section: "productAttributes" | "contentAttributes";

  /** Number of occurrences */
  occurrenceCount: number;
}

/**
 * Error message template for DuplicateAttributeError
 */
export function formatDuplicateAttributeError(ctx: DuplicateAttributeErrorContext): string {
  return (
    `Attribute "${ctx.attributeName}" is defined ${ctx.occurrenceCount} times in ${ctx.section}. ` +
    `Attribute names must be unique within each section.`
  );
}

/**
 * Suggestions for resolving DuplicateAttributeError
 */
export function getDuplicateAttributeSuggestions(
  ctx: DuplicateAttributeErrorContext
): readonly string[] {
  return [
    `Remove duplicate definitions of "${ctx.attributeName}" from ${ctx.section}`,
    `Rename one of the attributes to have a unique name`,
  ];
}

// ============================================================================
// AGGREGATE VALIDATION ERROR
// ============================================================================

/**
 * Aggregates multiple validation errors for batch reporting.
 * Used when multiple issues are found during config validation.
 */
export interface AggregateValidationErrorContext {
  /** Individual errors found during validation */
  errors: readonly {
    message: string;
    suggestions: readonly string[];
  }[];
}

/**
 * Format aggregate error for display
 */
export function formatAggregateValidationError(ctx: AggregateValidationErrorContext): string {
  const errorCount = ctx.errors.length;
  const header = `Found ${errorCount} configuration ${errorCount === 1 ? "error" : "errors"}:\n`;

  const body = ctx.errors
    .map((e, i) => {
      const suggestions = e.suggestions.map((s) => `    • ${s}`).join("\n");
      return `${i + 1}. ${e.message}\n${suggestions}`;
    })
    .join("\n\n");

  return header + body;
}

// ============================================================================
// CLI OUTPUT PATTERNS (FR-015, FR-016)
// ============================================================================

/**
 * Contract for CLI output when displaying validation errors.
 *
 * All user-facing output MUST use cliConsole methods (not console.log):
 * - cliConsole.error() for error messages
 * - cliConsole.warn() for warnings
 * - cliConsole.hint() for suggestions (getSuggestions() output)
 * - cliConsole.box() for migration guidance
 * - cliConsole.icon('error'|'warning'|'fix') for visual indicators
 *
 * @example
 * // Displaying an InlineAttributeError:
 * cliConsole.error(formatInlineAttributeError(ctx));
 * cliConsole.box([
 *   'Migration Required',
 *   '',
 *   ...getInlineAttributeSuggestions(ctx).map(s => `${cliConsole.icon('fix')} ${s}`)
 * ], 'How to Fix');
 *
 * @example
 * // Displaying an AttributeNotFoundError with suggestions:
 * cliConsole.error(formatAttributeNotFoundError(ctx));
 * for (const suggestion of getAttributeNotFoundSuggestions(ctx)) {
 *   cliConsole.hint(`  ${cliConsole.icon('fix')} ${suggestion}`);
 * }
 */
export interface CliOutputContract {
  /** Display error message using cliConsole.error() */
  displayError(message: string): void;

  /** Display warning using cliConsole.warn() */
  displayWarning(message: string): void;

  /** Display suggestion using cliConsole.hint() */
  displaySuggestion(suggestion: string): void;

  /** Display migration box using cliConsole.box() */
  displayMigrationBox(lines: string[], title: string): void;
}
