export interface LogEntry {
  readonly level: "info" | "warn" | "error" | "debug";
  readonly ts: string;
  readonly message: string;
}

export class JsonLogCollector {
  private logs: LogEntry[] = [];

  add(level: LogEntry["level"], message: string): void {
    this.logs.push({
      level,
      ts: new Date().toISOString(),
      message,
    });
  }

  getLogs(): readonly LogEntry[] {
    return [...this.logs];
  }

  reset(): void {
    this.logs = [];
  }
}

export const globalLogCollector = new JsonLogCollector();
