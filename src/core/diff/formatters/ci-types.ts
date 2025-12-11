import type { DiffChange, DiffOperation, DiffResult, DiffSummary, EntityType } from "../types";

/**
 * Severity level for changes - used for CI decision making
 */
export type ChangeSeverity = "info" | "warning" | "critical";

/**
 * JSON output format for CI/CD integration
 * Provides machine-readable diff results with GitHub Actions compatible outputs
 */
export interface DiffJsonOutput {
  /** Schema version for forward compatibility */
  readonly version: "1.0";
  /** ISO 8601 timestamp of when the diff was generated */
  readonly timestamp: string;
  /** Saleor GraphQL URL that was compared against */
  readonly saleorUrl?: string;
  /** Path to the configuration file used */
  readonly configFile?: string;
  /** Aggregated summary statistics */
  readonly summary: DiffJsonSummary;
  /** Changes grouped by entity type */
  readonly byEntityType: Record<string, EntityTypeChanges>;
  /** All individual changes */
  readonly changes: DiffEntityResult[];
  /** GitHub Actions compatible outputs for workflow integration */
  readonly outputs: GitHubActionsOutputs;
}

/**
 * Summary statistics for the diff
 */
export interface DiffJsonSummary {
  /** Total number of changes detected */
  readonly totalChanges: number;
  /** Number of CREATE operations */
  readonly creates: number;
  /** Number of UPDATE operations */
  readonly updates: number;
  /** Number of DELETE operations */
  readonly deletes: number;
  /** Whether any breaking changes were detected (deletions or critical updates) */
  readonly hasBreakingChanges: boolean;
  /** Whether any deletion operations were detected */
  readonly hasDeletions: boolean;
}

/**
 * Changes for a single entity type
 */
export interface EntityTypeChanges {
  /** Number of CREATE operations for this entity type */
  readonly creates: number;
  /** Number of UPDATE operations for this entity type */
  readonly updates: number;
  /** Number of DELETE operations for this entity type */
  readonly deletes: number;
  /** Individual entity changes */
  readonly entities: DiffEntityResult[];
}

/**
 * Single entity change result
 */
export interface DiffEntityResult {
  /** The operation to perform */
  readonly operation: DiffOperation;
  /** The type of entity */
  readonly entityType: EntityType;
  /** The name/identifier of the entity */
  readonly entityName: string;
  /** The slug of the entity (if applicable) */
  readonly entitySlug?: string;
  /** Specific field changes (for UPDATE operations) */
  readonly fieldChanges?: FieldChange[];
  /** Severity level for CI decision making */
  readonly severity: ChangeSeverity;
}

/**
 * Single field change within an UPDATE operation
 */
export interface FieldChange {
  /** The field name that changed */
  readonly field: string;
  /** The old/current value */
  readonly oldValue: unknown;
  /** The new/desired value */
  readonly newValue: unknown;
  /** Whether this change is considered breaking */
  readonly isBreaking: boolean;
}

/**
 * GitHub Actions compatible outputs
 * These can be set as step outputs for use in subsequent workflow steps
 */
export interface GitHubActionsOutputs {
  /** Whether any changes were detected */
  readonly has_changes: boolean;
  /** Whether any deletions were detected */
  readonly has_deletions: boolean;
  /** Whether any breaking changes were detected */
  readonly has_breaking: boolean;
  /** Total number of changes */
  readonly change_count: number;
  /** Number of CREATE operations */
  readonly create_count: number;
  /** Number of UPDATE operations */
  readonly update_count: number;
  /** Number of DELETE operations */
  readonly delete_count: number;
}

/**
 * Options for JSON formatting
 */
export interface JsonFormatOptions {
  /** Saleor URL for context */
  readonly saleorUrl?: string;
  /** Config file path for context */
  readonly configFile?: string;
  /** Whether to pretty print the JSON */
  readonly prettyPrint?: boolean;
}

/**
 * Classifies a diff result by severity for CI decision making
 */
export function classifyChangeSeverity(result: DiffResult): ChangeSeverity {
  // Deletions are always critical
  if (result.operation === "DELETE") {
    return "critical";
  }

  // Updates may be breaking depending on the field
  if (result.operation === "UPDATE" && result.changes) {
    const breakingFields = ["slug", "productType", "inputType", "type"];
    const hasBreaking = result.changes.some((change) => breakingFields.includes(change.field));
    if (hasBreaking) {
      return "warning";
    }
  }

  // Creates and non-breaking updates are informational
  return "info";
}

/**
 * Converts a DiffChange to a FieldChange with breaking flag
 */
export function toFieldChange(change: DiffChange): FieldChange {
  const breakingFields = ["slug", "productType", "inputType", "type"];
  return {
    field: change.field,
    oldValue: change.currentValue,
    newValue: change.desiredValue,
    isBreaking: breakingFields.includes(change.field),
  };
}

/**
 * Converts a DiffResult to a DiffEntityResult for JSON output
 */
export function toDiffEntityResult(result: DiffResult): DiffEntityResult {
  return {
    operation: result.operation,
    entityType: result.entityType,
    entityName: result.entityName,
    entitySlug: extractSlug(result),
    fieldChanges: result.changes?.map(toFieldChange),
    severity: classifyChangeSeverity(result),
  };
}

/**
 * Extracts the slug from a diff result if available
 */
function extractSlug(result: DiffResult): string | undefined {
  const source = result.desired || result.current;
  if (source && typeof source === "object" && "slug" in source) {
    return String(source.slug);
  }
  return undefined;
}

/**
 * Creates GitHub Actions outputs from a diff summary
 */
export function createGitHubActionsOutputs(summary: DiffSummary): GitHubActionsOutputs {
  return {
    has_changes: summary.totalChanges > 0,
    has_deletions: summary.deletes > 0,
    has_breaking:
      summary.deletes > 0 || summary.results.some((r) => classifyChangeSeverity(r) === "critical"),
    change_count: summary.totalChanges,
    create_count: summary.creates,
    update_count: summary.updates,
    delete_count: summary.deletes,
  };
}
