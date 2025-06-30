/**
 * Icons used in diff output formatting
 */
export const DIFF_ICONS = {
  OPERATIONS: {
    CREATE: "➕",
    UPDATE: "🔄",
    DELETE: "➖",
  },
  ENTITIES: {
    "Product Types": "📦",
    Channels: "🌐",
    "Page Types": "📄",
    Categories: "🏷️",
    "Shop Settings": "🏪",
  },
  SUMMARY: {
    RESULTS: "📊",
    SUCCESS: "✅",
    CHART: "📈",
  },
} as const;

/**
 * Text labels for diff operations
 */
export const OPERATION_LABELS = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
} as const;

/**
 * Default formatting configuration
 */
export const FORMAT_CONFIG = {
  SEPARATOR: "═",
  SUB_SEPARATOR: "─",
  TREE_BRANCH: "│",
  HEADER_WIDTH: 50,
  SUMMARY_WIDTH: 10,
} as const;

/**
 * Messages used in diff output
 */
export const DIFF_MESSAGES = {
  NO_CHANGES: "No differences found. Local configuration matches Saleor instance.",
  HEADER: "Configuration Diff Results",
  RECONCILE_INTRO:
    "The following changes would be applied to reconcile Saleor with your local configuration:",
  SUMMARY_HEADER: "Summary",
  DELETE_EXPLANATION: (entityType: string) =>
    `The ${entityType.toLowerCase()} exists on Saleor but is missing from the local configuration.`,
  FOUND_DIFFERENCES: (count: number) => `Found ${count} difference${count !== 1 ? "s" : ""}`,
  ITEMS_TO_CREATE: (count: number) => `${count} item${count !== 1 ? "s" : ""} to create`,
  ITEMS_TO_UPDATE: (count: number) => `${count} item${count !== 1 ? "s" : ""} to update`,
  ITEMS_TO_DELETE: (count: number) => `${count} item${count !== 1 ? "s" : ""} to delete`,
  TOTAL_CHANGES: (count: number) => `Total Changes: ${count}`,
  ENTITY_CHANGES: (entityType: string, count: number) =>
    `${entityType}: ${count} change${count !== 1 ? "s" : ""}`,
  OPERATION_COUNT: (count: number, operation: string) =>
    `${count} ${operation}${count !== 1 ? "s" : ""}`,
} as const;
