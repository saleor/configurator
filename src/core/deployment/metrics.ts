import type { DeploymentMetrics, EntityCount } from "./types";

export class MetricsCollector {
  private readonly startTime = new Date();
  private endTime?: Date;
  private readonly stageDurations = new Map<string, number>();
  private readonly stageStartTimes = new Map<string, number>();
  private readonly entityCounts = new Map<string, EntityCount>();

  startStage(name: string): void {
    this.stageStartTimes.set(name, Date.now());
  }

  endStage(name: string): void {
    const startTime = this.stageStartTimes.get(name);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.stageDurations.set(name, duration);
    this.stageStartTimes.delete(name);
  }

  recordEntity(type: string, operation: "create" | "update" | "delete"): void {
    const current = this.entityCounts.get(type) ?? {
      created: 0,
      updated: 0,
      deleted: 0,
    };

    this.entityCounts.set(type, {
      ...current,
      [operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"]:
        current[operation === "create" ? "created" : operation === "update" ? "updated" : "deleted"] + 1,
    });
  }

  complete(): DeploymentMetrics {
    this.endTime = new Date();
    
    return {
      duration: this.endTime.getTime() - this.startTime.getTime(),
      startTime: this.startTime,
      endTime: this.endTime,
      stageDurations: new Map(this.stageDurations),
      entityCounts: new Map(this.entityCounts),
    };
  }

  getMetrics(): DeploymentMetrics {
    const endTime = this.endTime ?? new Date();
    
    return {
      duration: endTime.getTime() - this.startTime.getTime(),
      startTime: this.startTime,
      endTime,
      stageDurations: new Map(this.stageDurations),
      entityCounts: new Map(this.entityCounts),
    };
  }
}