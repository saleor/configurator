import { AsyncLocalStorage } from "node:async_hooks";
import type { StageResilienceMetrics } from "../../core/deployment/types";

export type { StageResilienceMetrics };

interface MutableStageResilienceMetrics {
  rateLimitHits: number;
  retryAttempts: number;
  graphqlErrors: number;
  networkErrors: number;
}

interface StageContext {
  stageName: string;
  metrics: MutableStageResilienceMetrics;
  active: boolean;
}

function createEmptyMetrics(): MutableStageResilienceMetrics {
  return {
    rateLimitHits: 0,
    retryAttempts: 0,
    graphqlErrors: 0,
    networkErrors: 0,
  };
}

class ResilienceTracker {
  private readonly storage = new AsyncLocalStorage<StageContext>();
  private readonly allStageMetrics = new Map<string, StageResilienceMetrics>();

  startStageContext(stageName: string): void {
    const context: StageContext = {
      stageName,
      metrics: createEmptyMetrics(),
      active: true,
    };
    this.storage.enterWith(context);
  }

  endStageContext(): StageResilienceMetrics | undefined {
    const context = this.storage.getStore();
    if (!context || !context.active) return undefined;

    const frozenMetrics: StageResilienceMetrics = { ...context.metrics };
    this.allStageMetrics.set(context.stageName, frozenMetrics);

    context.active = false;

    return frozenMetrics;
  }

  private getActiveContext(): StageContext | undefined {
    const context = this.storage.getStore();
    return context?.active ? context : undefined;
  }

  recordRateLimit(): void {
    const context = this.getActiveContext();
    if (context) {
      context.metrics.rateLimitHits++;
    }
  }

  recordRetry(): void {
    const context = this.getActiveContext();
    if (context) {
      context.metrics.retryAttempts++;
    }
  }

  recordGraphQLError(): void {
    const context = this.getActiveContext();
    if (context) {
      context.metrics.graphqlErrors++;
    }
  }

  recordNetworkError(): void {
    const context = this.getActiveContext();
    if (context) {
      context.metrics.networkErrors++;
    }
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
