/**
 * Represents the type of diff operation that needs to be performed
 */
export type DiffOperation = "CREATE" | "UPDATE" | "DELETE";

/**
 * Represents a single entity type that can be compared
 */
export type EntityType =
  | "Product Types"
  | "Channels"
  | "Page Types"
  | "Categories"
  | "Shop Settings";

/**
 * Represents a single field change in a diff operation
 */
export interface DiffChange {
  /** The field name that changed */
  readonly field: string;
  /** The current value in the remote system */
  readonly currentValue: unknown;
  /** The desired value from the local configuration */
  readonly desiredValue: unknown;
  /** Optional human-readable description of the change */
  readonly description?: string;
}

/**
 * Represents the result of comparing a single entity
 * @template T The type of the entity being compared
 */
export interface DiffResult<T = unknown> {
  /** The operation that needs to be performed */
  readonly operation: DiffOperation;
  /** The type of entity being compared */
  readonly entityType: EntityType;
  /** The name/identifier of the specific entity */
  readonly entityName: string;
  /** Current state from the remote system (for UPDATE/DELETE operations) */
  readonly current?: T;
  /** Desired state from the local configuration (for CREATE/UPDATE operations) */
  readonly desired?: T;
  /** List of specific field changes (for UPDATE operations) */
  readonly changes?: readonly DiffChange[];
}

/**
 * Summary of all diff results with aggregated statistics
 */
export interface DiffSummary {
  /** Total number of changes detected */
  readonly totalChanges: number;
  /** Number of entities to create */
  readonly creates: number;
  /** Number of entities to update */
  readonly updates: number;
  /** Number of entities to delete */
  readonly deletes: number;
  /** All individual diff results */
  readonly results: readonly DiffResult[];
}

/**
 * Configuration options for diff operations
 */
export interface DiffOptions {
  /** Path to the configuration file */
  readonly configPath?: string;
  /** Whether to include detailed change descriptions */
  readonly includeDetails?: boolean;
  /** Entity types to include in the diff (all by default) */
  readonly entityTypes?: readonly EntityType[];
}

/**
 * Configuration sections for selective operations
 */
export type ConfigurationSection = 
  | "shop" 
  | "channels" 
  | "productTypes" 
  | "pageTypes" 
  | "categories" 
  | "products" 
  | "attributes";

/**
 * Parsed selective options from command line
 */
export interface ParsedSelectiveOptions {
  readonly includeSections: readonly ConfigurationSection[];
  readonly excludeSections: readonly ConfigurationSection[];
}

/**
 * Options for introspect-specific diff operations
 */
export interface IntrospectDiffOptions {
  /** Output format for the diff */
  readonly format?: "table" | "json" | "yaml";
  /** Whether to suppress output messages */
  readonly quiet?: boolean;
  /** Sections to include (empty array means include all) */
  readonly includeSections?: readonly ConfigurationSection[];
  /** Sections to exclude */
  readonly excludeSections?: readonly ConfigurationSection[];
}

/**
 * Result of introspect diff operation with formatted output
 */
export interface IntrospectDiffResult {
  /** Summary of the diff operation */
  readonly summary: DiffSummary;
  /** Formatted output string (if not in quiet mode) */
  readonly formattedOutput?: string;
}

/**
 * Options for diff service when doing introspect comparison
 */
export interface DiffServiceIntrospectOptions {
  /** Sections to include (empty array means include all) */
  readonly includeSections?: readonly ConfigurationSection[];
  /** Sections to exclude */
  readonly excludeSections?: readonly ConfigurationSection[];
}

/**
 * Statistics about diff results grouped by entity type
 */
export interface DiffStatistics {
  /** Total changes by entity type */
  readonly byEntityType: ReadonlyMap<EntityType, number>;
  /** Total changes by operation type */
  readonly byOperation: ReadonlyMap<DiffOperation, number>;
  /** Most common change type */
  readonly mostCommonOperation: DiffOperation | null;
}
