import { writeFile } from "node:fs/promises";
import type { DeploymentMetrics } from "./types";
import type { DiffSummary, DiffResult } from "../diff";

export interface DeploymentReport {
  timestamp: string;
  duration: {
    totalMs: number;
    formatted: string;
  };
  startTime: string;
  endTime: string;
  stages: Array<{
    name: string;
    durationMs: number;
    durationFormatted: string;
  }>;
  summary: {
    totalChanges: number;
    created: number;
    updated: number;
    deleted: number;
  };
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
  entityCounts: Record<string, {
    created: number;
    updated: number;
    deleted: number;
  }>;
}

export class DeploymentReportGenerator {
  constructor(
    private readonly metrics: DeploymentMetrics,
    private readonly summary: DiffSummary
  ) {}

  generate(): DeploymentReport {
    return {
      timestamp: new Date().toISOString(),
      duration: {
        totalMs: this.metrics.duration,
        formatted: this.formatDuration(this.metrics.duration),
      },
      startTime: this.metrics.startTime.toISOString(),
      endTime: this.metrics.endTime.toISOString(),
      stages: this.formatStages(),
      summary: {
        totalChanges: this.summary.totalChanges,
        created: this.summary.creates,
        updated: this.summary.updates,
        deleted: this.summary.deletes,
      },
      changes: this.formatChanges(),
      entityCounts: this.formatEntityCounts(),
    };
  }

  async saveToFile(path: string): Promise<void> {
    const report = this.generate();
    const json = JSON.stringify(report, null, 2);
    await writeFile(path, json, "utf-8");
  }

  private formatStages(): Array<{ name: string; durationMs: number; durationFormatted: string }> {
    const stages: Array<{ name: string; durationMs: number; durationFormatted: string }> = [];
    
    for (const [name, duration] of this.metrics.stageDurations) {
      stages.push({
        name,
        durationMs: duration,
        durationFormatted: this.formatDuration(duration),
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
    return this.summary.results.map((result: DiffResult) => {
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
        change.fields = result.changes.map((fieldChange: {
          field: string;
          currentValue: unknown;
          desiredValue: unknown;
        }) => ({
          field: fieldChange.field,
          oldValue: fieldChange.currentValue ?? null,
          newValue: fieldChange.desiredValue ?? null,
        }));
      }

      return change;
    });
  }

  private formatEntityCounts(): Record<string, { created: number; updated: number; deleted: number }> {
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