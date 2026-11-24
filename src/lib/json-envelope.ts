import { writeFileSync } from "node:fs";
import { globalLogCollector, type LogEntry } from "./json-log-collector";
import { getPackageVersion } from "./package-info";

export interface EnvelopeError {
  readonly entity?: string;
  readonly stage?: string;
  readonly message: string;
}

interface JsonEnvelope<T = unknown> {
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

/** Where a command's JSON envelope goes: stdout, a file, both or neither. */
export interface EnvelopeTarget {
  readonly print: boolean;
  readonly file?: string;
}

export function outputEnvelope<T>(
  envelope: JsonEnvelope<T>,
  target: EnvelopeTarget = { print: true }
): void {
  const json = JSON.stringify(envelope, null, 2);
  if (target.file) {
    writeFileSync(target.file, `${json}\n`, "utf-8");
  }
  if (target.print) {
    console.log(json);
  }
}
