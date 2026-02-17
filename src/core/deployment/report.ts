import { writeFile } from "node:fs/promises";
import type { DiffResult, DiffSummary } from "../diff";
import type { DeploymentMetrics, StageResilienceMetrics } from "./types";

/**
 * Empty resilience metrics used as default when no metrics are available
 */
const EMPTY_RESILIENCE_METRICS: StageResilienceMetrics = {
  rateLimitHits: 0,
  retryAttempts: 0,
  graphqlErrors: 0,
  networkErrors: 0,
};

/** Summary of resilience metrics for the entire deployment */
type ResilienceSummary = StageResilienceMetrics;

/** Resilience metrics for a single stage */
type StageResilienceReport = StageResilienceMetrics;

export interface DeploymentReport {
  timestamp: string;

  summary: {
    status: "success" | "partial" | "failed";
    duration: {
      totalMs: number;
      formatted: string;
    };
    changes: {
      total: number;
      created: number;
      updated: number;
      deleted: number;
    };
    resilience: ResilienceSummary;
  };

  stages: Array<{
    name: string;
    durationMs: number;
    durationFormatted: string;
    resilience: StageResilienceReport;
  }>;

  changes: Array<{
    entityType: string;
    entityName: string;
    operation: "CREATE" | "UPDATE" | "DELETE";
    fields?: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>;
  }>;

  entityCounts: Record<
    string,
    {
      created: number;
      updated: number;
      deleted: number;
    }
  >;

  metadata: {
    startTime: string;
    endTime: string;
  };
}

/**
 * Generates structured deployment reports for machine consumption
 * Includes timing, changes, resilience metrics, and entity breakdowns
 */
export class DeploymentReportGenerator {
  constructor(
    private readonly metrics: DeploymentMetrics,
    private readonly diffSummary: DiffSummary,
    private readonly status: "success" | "partial" | "failed" = "success"
  ) {}

  /**
   * Generate the complete deployment report
   * @returns Structured deployment report
   */
  generate(): DeploymentReport {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        status: this.status,
        duration: {
          totalMs: this.metrics.duration,
          formatted: this.formatDuration(this.metrics.duration),
        },
        changes: {
          total: this.diffSummary.totalChanges,
          created: this.diffSummary.creates,
          updated: this.diffSummary.updates,
          deleted: this.diffSummary.deletes,
        },
        resilience: {
          rateLimitHits: this.metrics.totalRateLimitHits,
          retryAttempts: this.metrics.totalRetries,
          graphqlErrors: this.metrics.totalGraphQLErrors,
          networkErrors: this.metrics.totalNetworkErrors,
        },
      },
      stages: this.formatStages(),
      changes: this.formatChanges(),
      entityCounts: this.formatEntityCounts(),
      metadata: {
        startTime: this.metrics.startTime.toISOString(),
        endTime: this.metrics.endTime.toISOString(),
      },
    };
  }

  /**
   * Save the deployment report as JSON to a file
   * @param path - File path to save the report
   */
  async saveToFile(path: string): Promise<void> {
    const report = this.generate();
    const json = JSON.stringify(report, null, 2);
    await writeFile(path, json, "utf-8");
  }

  private formatStages(): Array<{
    name: string;
    durationMs: number;
    durationFormatted: string;
    resilience: StageResilienceReport;
  }> {
    const stages: Array<{
      name: string;
      durationMs: number;
      durationFormatted: string;
      resilience: StageResilienceReport;
    }> = [];

    for (const [name, duration] of this.metrics.stageDurations) {
      const resilienceMetrics = this.metrics.stageResilience.get(name);
      stages.push({
        name,
        durationMs: duration,
        durationFormatted: this.formatDuration(duration),
        resilience: resilienceMetrics ?? EMPTY_RESILIENCE_METRICS,
      });
    }

    return stages;
  }

  private formatChanges(): Array<{
    entityType: string;
    entityName: string;
    operation: "CREATE" | "UPDATE" | "DELETE";
    fields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  }> {
    return this.diffSummary.results.map((result: DiffResult) => {
      const change: {
        entityType: string;
        entityName: string;
        operation: "CREATE" | "UPDATE" | "DELETE";
        fields?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
      } = {
        entityType: result.entityType,
        entityName: result.entityName,
        operation: result.operation,
      };

      if (result.changes && result.changes.length > 0) {
        change.fields = result.changes.map(
          (fieldChange: { field: string; currentValue: unknown; desiredValue: unknown }) => ({
            field: fieldChange.field,
            oldValue: fieldChange.currentValue ?? null,
            newValue: fieldChange.desiredValue ?? null,
          })
        );
      }

      return change;
    });
  }

  private formatEntityCounts(): Record<
    string,
    { created: number; updated: number; deleted: number }
  > {
    const counts: Record<string, { created: number; updated: number; deleted: number }> = {};

    for (const [type, count] of this.metrics.entityCounts) {
      counts[type] = {
        created: count.created,
        updated: count.updated,
        deleted: count.deleted,
      };
    }

    return counts;
  }

  private formatDuration(ms: number): string {
    const seconds = ms / 1000;
    if (seconds < 1) {
      return `${ms}ms`;
    } else if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    }
  }
}
