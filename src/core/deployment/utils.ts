import type { OperationResilienceMetrics } from "./types";

export interface OperationResilienceHotspot {
  readonly operation: string;
  readonly rateLimitHits: number;
  readonly retryAttempts: number;
  readonly graphqlErrors: number;
  readonly networkErrors: number;
  readonly totalEvents: number;
  readonly throttleEvents: number;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string (e.g., "150ms", "2.5s", "1m 30s")
 */
export function formatDuration(ms: number): string {
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

function toHotspot(
  operation: string,
  metrics: OperationResilienceMetrics
): OperationResilienceHotspot {
  const totalEvents =
    metrics.rateLimitHits + metrics.retryAttempts + metrics.graphqlErrors + metrics.networkErrors;
  const throttleEvents = metrics.rateLimitHits + metrics.retryAttempts;

  return {
    operation,
    rateLimitHits: metrics.rateLimitHits,
    retryAttempts: metrics.retryAttempts,
    graphqlErrors: metrics.graphqlErrors,
    networkErrors: metrics.networkErrors,
    totalEvents,
    throttleEvents,
  };
}

/**
 * Returns top operation-level hotspots for throttling/retries.
 * Ordered by throttle events first, then total resilience events.
 */
export function getTopOperationResilienceHotspots(
  operationResilience: ReadonlyMap<string, OperationResilienceMetrics> | undefined,
  limit = 5
): OperationResilienceHotspot[] {
  if (!operationResilience || operationResilience.size === 0 || limit <= 0) {
    return [];
  }

  return Array.from(operationResilience.entries(), ([operation, metrics]) =>
    toHotspot(operation, metrics)
  )
    .filter((hotspot) => hotspot.throttleEvents > 0)
    .sort((a, b) => {
      if (b.throttleEvents !== a.throttleEvents) {
        return b.throttleEvents - a.throttleEvents;
      }

      if (b.totalEvents !== a.totalEvents) {
        return b.totalEvents - a.totalEvents;
      }

      return a.operation.localeCompare(b.operation);
    })
    .slice(0, limit);
}
