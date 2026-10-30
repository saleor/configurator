/** Stable data contracts for the in-process engine. */
/** JSON-shaped data, as config.yml holds. */
export type Json =
  | null
  | number
  | boolean
  | string
  | readonly Json[]
  | { readonly [key: string]: Json };

/** A parsed config.yml. Its shape is Configurator's schema (schema.json). */
export type SaleorConfig = { readonly [key: string]: Json };

export type DiffOperation = "CREATE" | "UPDATE" | "DELETE";

export interface DiffChange {
  readonly field: string;
  readonly currentValue: Json | undefined;
  readonly desiredValue: Json | undefined;
  readonly description?: string;
}

export interface DiffResult {
  readonly operation: DiffOperation;
  readonly entityType: string;
  readonly entityName: string;
  readonly changes?: readonly DiffChange[];
}

export interface DiffSummary {
  readonly totalChanges: number;
  readonly creates: number;
  readonly updates: number;
  readonly deletes: number;
  readonly results: readonly DiffResult[];
}

export interface StageResult {
  readonly name: string;
  readonly status: string;
  readonly duration?: number;
  readonly successCount: number;
  readonly error?: string;
}

export interface DeploymentResult {
  readonly overallStatus: "success" | "partial" | "failed";
  readonly totalDuration: number;
  readonly stages: readonly StageResult[];
  readonly summary: {
    readonly totalEntities: number;
    readonly successfulEntities: number;
    readonly failedEntities: number;
    readonly skippedStages: number;
    readonly completedStages: number;
    readonly failedStages: number;
  };
}
