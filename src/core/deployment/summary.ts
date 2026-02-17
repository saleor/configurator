import { cliConsole } from "../../cli/console";
import type { DiffSummary } from "../diff";
import type { DeploymentMetrics } from "./types";

/**
 * Generates and displays a human-readable summary of deployment results
 * including timing, changes applied, and resilience statistics
 */
export class DeploymentSummaryReport {
  private readonly maxLineWidth = 57; // Box width (60) minus padding and borders

  constructor(
    private readonly metrics: DeploymentMetrics,
    private readonly summary: DiffSummary
  ) {}

  /**
   * Display the deployment summary in a formatted box to the console
   */
  display(): void {
    const lines = this.buildSummaryLines();
    cliConsole.box(lines, "📊 Deployment Summary");
  }

  private truncateLine(line: string): string {
    if (line.length <= this.maxLineWidth) {
      return line;
    }
    return `${line.substring(0, this.maxLineWidth - 3)}...`;
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
        const line = `• ${stage}: ${this.formatDuration(duration)}`;
        lines.push(this.truncateLine(line));
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

    // Resilience stats (only show if there were any events)
    if (this.hasResilienceStats()) {
      lines.push("");
      lines.push("Resilience Stats:");
      if (this.metrics.totalRateLimitHits > 0) {
        lines.push(`• Rate Limits: ${this.metrics.totalRateLimitHits} handled`);
      }
      if (this.metrics.totalRetries > 0) {
        lines.push(`• Retries: ${this.metrics.totalRetries} attempts`);
      }
      if (this.metrics.totalGraphQLErrors > 0) {
        lines.push(`• GraphQL Errors: ${this.metrics.totalGraphQLErrors}`);
      }
      if (this.metrics.totalNetworkErrors > 0) {
        lines.push(`• Network Errors: ${this.metrics.totalNetworkErrors}`);
      }
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
          const line = `• ${type}: ${parts.join(", ")}`;
          lines.push(this.truncateLine(line));
        }
      }
    }

    return lines;
  }

  private hasResilienceStats(): boolean {
    return (
      this.metrics.totalRateLimitHits > 0 ||
      this.metrics.totalRetries > 0 ||
      this.metrics.totalGraphQLErrors > 0 ||
      this.metrics.totalNetworkErrors > 0
    );
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
