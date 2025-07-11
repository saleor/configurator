import { DIFF_ICONS, FORMAT_CONFIG, OPERATION_LABELS } from "../constants";
import { DiffSummaryError } from "../errors";
import type {
  DiffOperation,
  DiffResult,
  DiffSummary,
  EntityType,
} from "../types";

/**
 * Base formatter providing common formatting utilities
 */
export abstract class BaseDiffFormatter {
  /**
   * Groups diff results by entity type for organized output
   */
  protected groupByEntityType(
    results: readonly DiffResult[]
  ): ReadonlyMap<EntityType, readonly DiffResult[]> {
    const grouped = new Map<EntityType, DiffResult[]>();

    for (const result of results) {
      const entityType = result.entityType;
      if (!grouped.has(entityType)) {
        grouped.set(entityType, []);
      }
      grouped.get(entityType)!.push(result);
    }

    // Convert to readonly map
    return new Map(
      Array.from(grouped.entries()).map(([key, value]) => [
        key,
        Object.freeze(value),
      ])
    );
  }

  /**
   * Gets the appropriate icon for an entity type
   */
  protected getEntityIcon(entityType: EntityType): string {
    return DIFF_ICONS.ENTITIES[entityType] || "🔧";
  }

  /**
   * Gets the appropriate icon for a diff operation
   */
  protected getOperationIcon(operation: DiffOperation): string {
    return DIFF_ICONS.OPERATIONS[operation];
  }

  /**
   * Gets the human-readable text for a diff operation
   */
  protected getOperationText(operation: DiffOperation): string {
    return OPERATION_LABELS[operation];
  }

  /**
   * Creates a separator line of specified width and character
   */
  protected createSeparator(
    width: number,
    char: string = FORMAT_CONFIG.SEPARATOR
  ): string {
    return "".padEnd(width, char);
  }

  /**
   * Formats plural forms correctly based on count
   */
  protected formatPlural(
    count: number,
    singular: string,
    plural?: string
  ): string {
    if (count === 1) return singular;
    return plural || `${singular}s`;
  }

  /**
   * Validates that the summary contains valid data
   */
  protected validateSummary(summary: DiffSummary): void {
    if (summary.totalChanges < 0) {
      throw new DiffSummaryError("Total changes cannot be negative");
    }

    if (summary.creates < 0 || summary.updates < 0 || summary.deletes < 0) {
      throw new DiffSummaryError("Operation counts cannot be negative");
    }

    const calculatedTotal = summary.creates + summary.updates + summary.deletes;
    if (calculatedTotal !== summary.totalChanges) {
      throw new DiffSummaryError(
        "Total changes does not match sum of individual operations"
      );
    }
  }

  /**
   * Abstract method that subclasses must implement to format the summary
   */
  abstract format(summary: DiffSummary): string;
}
