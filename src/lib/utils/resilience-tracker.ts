import { AsyncLocalStorage } from "node:async_hooks";
import type {
  OperationResilienceMetrics,
  StageResilienceMetrics,
} from "../../core/deployment/types";
import { logger } from "../logger";

export type { StageResilienceMetrics };

interface MutableResilienceMetrics {
  rateLimitHits: number;
  retryAttempts: number;
  graphqlErrors: number;
  networkErrors: number;
}

type MetricName = keyof MutableResilienceMetrics;

interface StageContext {
  stageName: string;
  metrics: MutableResilienceMetrics;
  operationMetrics: Map<string, MutableResilienceMetrics>;
  active: boolean;
}

function createEmptyMetrics(): MutableResilienceMetrics {
  return {
    rateLimitHits: 0,
    retryAttempts: 0,
    graphqlErrors: 0,
    networkErrors: 0,
  };
}

function freezeOperationMetrics(
  metrics: Map<string, MutableResilienceMetrics>
): Readonly<Record<string, OperationResilienceMetrics>> | undefined {
  if (metrics.size === 0) {
    return undefined;
  }

  const entries = Array.from(metrics.entries()).map(([operation, values]) => [
    operation,
    { ...values },
  ]);

  return Object.fromEntries(entries);
}

function freezeContext(context: StageContext): StageResilienceMetrics {
  const operations = freezeOperationMetrics(context.operationMetrics);
  return operations ? { ...context.metrics, operations } : { ...context.metrics };
}

class ResilienceTracker {
  private readonly storage = new AsyncLocalStorage<StageContext>();
  private readonly allStageMetrics = new Map<string, StageResilienceMetrics>();

  /**
   * Run a function within an isolated stage context using storage.run().
   * This scopes the context to the callback's async tree, preventing
   * metric attribution leaks across stage boundaries.
   */
  async runInStageContext<T>(
    stageName: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; metrics: StageResilienceMetrics }> {
    const context: StageContext = {
      stageName,
      metrics: createEmptyMetrics(),
      operationMetrics: new Map(),
      active: true,
    };

    const result = await this.storage.run(context, async () => {
      try {
        return await fn();
      } finally {
        context.active = false;
      }
    });

    const frozenMetrics = freezeContext(context);
    this.allStageMetrics.set(stageName, frozenMetrics);

    return { result, metrics: frozenMetrics };
  }

  private getActiveContext(): StageContext | undefined {
    const context = this.storage.getStore();
    return context?.active ? context : undefined;
  }

  private recordMetric(metricName: MetricName, operationKey?: string): void {
    const context = this.getActiveContext();
    if (context) {
      context.metrics[metricName]++;

      if (operationKey) {
        const existing = context.operationMetrics.get(operationKey) ?? createEmptyMetrics();
        existing[metricName]++;
        context.operationMetrics.set(operationKey, existing);
      }
    } else {
      logger.warn(`${metricName} recorded outside stage context`);
    }
  }

  recordRateLimit(operationKey?: string): void {
    this.recordMetric("rateLimitHits", operationKey);
  }

  recordRetry(operationKey?: string): void {
    this.recordMetric("retryAttempts", operationKey);
  }

  recordGraphQLError(operationKey?: string): void {
    this.recordMetric("graphqlErrors", operationKey);
  }

  recordNetworkError(operationKey?: string): void {
    this.recordMetric("networkErrors", operationKey);
  }

  getStageMetrics(stageName: string): StageResilienceMetrics | undefined {
    return this.allStageMetrics.get(stageName);
  }

  getAllStageMetrics(): ReadonlyMap<string, StageResilienceMetrics> {
    return new Map(this.allStageMetrics);
  }

  isInStageContext(): boolean {
    return this.getActiveContext() !== undefined;
  }

  getCurrentStageName(): string | undefined {
    return this.getActiveContext()?.stageName;
  }

  reset(): void {
    this.allStageMetrics.clear();
  }
}

export const resilienceTracker = new ResilienceTracker();
