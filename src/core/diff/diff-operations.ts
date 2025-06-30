import type { DiffSummary, DiffResult, DiffStatistics, EntityType, DiffOperation } from "./types";

/**
 * Calculates statistics from a diff summary
 * @param summary The diff summary to analyze
 * @returns Statistics about the diff results
 */
export function calculateDiffStatistics(summary: DiffSummary): DiffStatistics {
  const byEntityType = new Map<EntityType, number>();
  const byOperation = new Map<DiffOperation, number>();

  // Count by entity type
  for (const result of summary.results) {
    const current = byEntityType.get(result.entityType) || 0;
    byEntityType.set(result.entityType, current + 1);
  }

  // Count by operation
  byOperation.set("CREATE", summary.creates);
  byOperation.set("UPDATE", summary.updates);
  byOperation.set("DELETE", summary.deletes);

  // Find most common operation
  const mostCommonOperation =
    Array.from(byOperation.entries())
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

  return {
    byEntityType,
    byOperation,
    mostCommonOperation,
  };
}

/**
 * Filters diff results by entity type
 * @param summary The diff summary to filter
 * @param entityTypes The entity types to include
 * @returns A new diff summary with filtered results
 */
export function filterDiffByEntityType(
  summary: DiffSummary,
  entityTypes: readonly EntityType[]
): DiffSummary {
  const filteredResults = summary.results.filter((result) =>
    entityTypes.includes(result.entityType)
  );

  return recalculateDiffSummary(filteredResults);
}

/**
 * Filters diff results by operation type
 * @param summary The diff summary to filter
 * @param operations The operations to include
 * @returns A new diff summary with filtered results
 */
export function filterDiffByOperation(
  summary: DiffSummary,
  operations: readonly DiffOperation[]
): DiffSummary {
  const filteredResults = summary.results.filter((result) => operations.includes(result.operation));

  return recalculateDiffSummary(filteredResults);
}

/**
 * Checks if the diff summary indicates any changes
 * @param summary The diff summary to check
 * @returns True if there are changes, false otherwise
 */
export function hasDiffChanges(summary: DiffSummary): boolean {
  return summary.totalChanges > 0;
}

/**
 * Checks if the diff summary indicates only safe operations (no deletes)
 * @param summary The diff summary to check
 * @returns True if only safe operations are present, false otherwise
 */
export function hasSafeDiffChangesOnly(summary: DiffSummary): boolean {
  return summary.deletes === 0;
}

/**
 * Gets results for a specific entity type
 * @param summary The diff summary to search
 * @param entityType The entity type to filter by
 * @returns Array of diff results for the specified entity type
 */
export function getDiffResultsForEntityType(
  summary: DiffSummary,
  entityType: EntityType
): readonly DiffResult[] {
  return summary.results.filter((result) => result.entityType === entityType);
}

/**
 * Gets results for a specific operation type
 * @param summary The diff summary to search
 * @param operation The operation type to filter by
 * @returns Array of diff results for the specified operation
 */
export function getDiffResultsForOperation(
  summary: DiffSummary,
  operation: DiffOperation
): readonly DiffResult[] {
  return summary.results.filter((result) => result.operation === operation);
}

/**
 * Recalculates summary statistics from a filtered set of results
 * @param results The filtered diff results
 * @returns A new diff summary with recalculated statistics
 */
function recalculateDiffSummary(results: readonly DiffResult[]): DiffSummary {
  const creates = results.filter((r) => r.operation === "CREATE").length;
  const updates = results.filter((r) => r.operation === "UPDATE").length;
  const deletes = results.filter((r) => r.operation === "DELETE").length;

  return {
    totalChanges: results.length,
    creates,
    updates,
    deletes,
    results,
  };
}
