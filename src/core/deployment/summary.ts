import { cliConsole } from "../../cli/console";
import type { DeploymentMetrics } from "./types";
import type { DiffSummary } from "../diff";

export class DeploymentSummaryReport {
  constructor(
    private readonly metrics: DeploymentMetrics,
    private readonly summary: DiffSummary
  ) {}

  display(): void {
    const lines = this.buildSummaryLines();
    cliConsole.box(lines, "📊 Deployment Summary");
  }

  private buildSummaryLines(): string[] {
    const lines: string[] = [];

    // Timing information
    lines.push(`Duration: ${this.formatDuration(this.metrics.duration)}`);
    lines.push(`Started: ${this.metrics.startTime.toLocaleTimeString()}`);
    lines.push(`Completed: ${this.metrics.endTime.toLocaleTimeString()}`);
    lines.push("");

    // Stage breakdown if we have significant duration
    if (this.metrics.stageDurations.size > 0) {
      lines.push("Stage Timing:");
      for (const [stage, duration] of this.metrics.stageDurations) {
        lines.push(`• ${stage}: ${this.formatDuration(duration)}`);
      }
      lines.push("");
    }

    // Changes applied
    if (this.summary.totalChanges > 0) {
      lines.push("Changes Applied:");
      if (this.summary.creates > 0) {
        lines.push(`• Created: ${this.summary.creates} entities`);
      }
      if (this.summary.updates > 0) {
        lines.push(`• Updated: ${this.summary.updates} entities`);
      }
      if (this.summary.deletes > 0) {
        lines.push(`• Deleted: ${this.summary.deletes} entities`);
      }
    } else {
      lines.push("No changes were applied");
    }

    // Entity breakdown if available
    if (this.metrics.entityCounts.size > 0) {
      lines.push("");
      lines.push("By Entity Type:");
      for (const [type, counts] of this.metrics.entityCounts) {
        const parts: string[] = [];
        if (counts.created > 0) parts.push(`${counts.created} created`);
        if (counts.updated > 0) parts.push(`${counts.updated} updated`);
        if (counts.deleted > 0) parts.push(`${counts.deleted} deleted`);
        
        if (parts.length > 0) {
          lines.push(`• ${type}: ${parts.join(", ")}`);
        }
      }
    }

    return lines;
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