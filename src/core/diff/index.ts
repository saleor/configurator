// Types
export type {
  DiffOperation,
  EntityType,
  DiffChange,
  DiffResult,
  DiffSummary,
  DiffOptions,
  DiffStatistics,
} from "./types";

// Main formatter (backward compatible)
export { DiffFormatter } from "./formatter";

// Individual formatters for more specific use cases
export {
  BaseDiffFormatter,
  DetailedDiffFormatter,
  SummaryDiffFormatter,
  createDetailedFormatter,
  createSummaryFormatter,
} from "./formatters";

// Diff operations
export {
  calculateDiffStatistics,
  filterDiffByEntityType,
  filterDiffByOperation,
  hasDiffChanges,
  hasSafeDiffChangesOnly,
  getDiffResultsForEntityType,
  getDiffResultsForOperation,
} from "./diff-operations";

// Diff service
export { DiffService, type DiffServiceConfig } from "./service";

// Comparators
export type { EntityComparator } from "./comparators";

// Constants
export { DIFF_ICONS, OPERATION_LABELS, FORMAT_CONFIG, DIFF_MESSAGES } from "./constants";
