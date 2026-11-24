import type { MetadataKeyFilter } from "../../modules/metadata/metadata";

/**
 * Represents the type of diff operation that needs to be performed
 */
export type DiffOperation = "CREATE" | "UPDATE" | "DELETE";

/**
 * Canonical list of entity types that can be compared.
 * EntityType union is derived from this array.
 */
export const ENTITY_TYPES = [
  "Product Types",
  "Products",
  "Channels",
  "Page Types",
  "Model Types",
  "Categories",
  "Collections",
  "Menus",
  "Models",
  "Shop Settings",
  "Warehouses",
  "TaxClasses",
  "Shipping Zones",
  "Product Attributes",
  "Content Attributes",
  "Customer Attributes",
  "Customer Types",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/**
 * How a value differs: `changed` values exist on both sides; `added` exists only in the config;
 * `removed` exists only in Saleor.
 */
export type DiffChangeKind = "changed" | "added" | "removed";

/**
 * Represents a single field change in a diff operation
 */
export interface DiffChange {
  /** The path joined with dots, e.g. `variants.TEE-S.weight`. */
  readonly field: string;
  /**
   * Path from the entity to the changed value, one segment per key, e.g.
   * `["variants", "TEE-S", "weight"]`. Unlike `field`, segments may contain dots.
   */
  readonly path: readonly string[];
  readonly kind: DiffChangeKind;
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
export interface DiffResult<T extends Record<string, unknown> = Record<string, unknown>> {
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
  /**
   * When true, excludes media fields from comparison.
   * Media differences will not be reported in diff results.
   */
  readonly skipMedia?: boolean;
  /**
   * When true, metadata keys present only on the compared-against side are reported as removals.
   * Introspect sets it because it rewrites the file with the full (filtered) remote metadata;
   * deploy leaves it off so keys not listed in config stay unmanaged.
   */
  readonly compareAllMetadataKeys?: boolean;
  /** Sections to include (empty array means include all) */
  readonly includeSections?: readonly ConfigurationSection[];
  /** Sections to exclude */
  readonly excludeSections?: readonly ConfigurationSection[];
}

/**
 * Configuration sections for selective operations
 */
export type ConfigurationSection =
  | "shop"
  | "channels"
  | "productTypes"
  | "pageTypes"
  | "modelTypes"
  | "categories"
  | "collections"
  | "menus"
  | "models"
  | "products"
  | "productAttributes"
  | "contentAttributes"
  | "customerAttributes"
  | "customerTypes"
  | "warehouses"
  | "shippingZones"
  | "taxClasses";

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
  /** Metadata keys to bring into the config file */
  readonly metadataKeyFilter?: MetadataKeyFilter;
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
  /** Metadata keys to bring into the config file */
  readonly metadataKeyFilter?: MetadataKeyFilter;
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
