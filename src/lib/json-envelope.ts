import { globalLogCollector, type LogEntry } from "./json-log-collector";
import { getPackageVersion } from "./package-info";

export interface EnvelopeError {
  readonly entity?: string;
  readonly stage?: string;
  readonly message: string;
}

export interface JsonEnvelope<T = unknown> {
  readonly command: string;
  readonly version: string;
  readonly exitCode: number;
  readonly result: T;
  readonly logs: readonly LogEntry[];
  readonly errors: readonly EnvelopeError[];
}

export function buildEnvelope<T>(options: {
  command: string;
  exitCode: number;
  result: T;
  logs?: readonly LogEntry[];
  errors?: readonly EnvelopeError[];
}): JsonEnvelope<T> {
  return {
    command: options.command,
    version: getPackageVersion(),
    exitCode: options.exitCode,
    result: options.result,
    logs: options.logs ?? globalLogCollector.getLogs(),
    errors: options.errors ?? [],
  };
}

export function outputEnvelope<T>(envelope: JsonEnvelope<T>): void {
  console.log(JSON.stringify(envelope, null, 2));
}
