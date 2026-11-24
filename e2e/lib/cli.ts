import { spawnSync } from "node:child_process";
import path from "node:path";

/** The checkout's build. `pnpm build` must have run; the suite never runs the CLI from source. */
export const CHECKOUT_CLI = path.join(import.meta.dirname, "..", "..", "bin", "cli.mjs");

/** The single JSON document the CLI prints on stdout in non-interactive mode. */
export interface Envelope<Result = Record<string, unknown>> {
  command: string;
  version: string;
  exitCode: number;
  result: Result;
  logs: { level: string; message: string }[];
  errors: { message: string }[];
}

export interface CliRun {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a CLI binary with piped stdio, which is what puts it in non-interactive mode, and in
 * `cwd` so reports and written configs stay in the test's workspace.
 */
export function runCli(
  args: string[],
  { cwd, bin = CHECKOUT_CLI }: { cwd: string; bin?: string }
): CliRun {
  const run = spawnSync(process.execPath, [bin, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, LOG_LEVEL: "info" },
    timeout: 5 * 60_000,
  });
  if (run.error) throw run.error;
  return { exitCode: run.status ?? -1, stdout: run.stdout, stderr: run.stderr };
}

export function parseEnvelope<Result>(run: CliRun): Envelope<Result> {
  try {
    return JSON.parse(run.stdout) as Envelope<Result>;
  } catch {
    throw new Error(
      `CLI exited ${run.exitCode} without a JSON envelope.\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`
    );
  }
}

/**
 * A CLI bound to one Saleor, for the commands that take `--url` and `--token`. Config paths are
 * passed relative to `cwd`: the CLI refuses paths outside its working directory.
 */
export function saleorCli(
  saleor: { apiUrl: string; token: string },
  cwd: string,
  bin = CHECKOUT_CLI
) {
  const run = <Result>(command: string, configPath: string, extra: string[] = []) =>
    parseEnvelope<Result>(
      runCli(
        [
          command,
          `--config=${path.relative(cwd, configPath)}`,
          `--url=${saleor.apiUrl}`,
          `--token=${saleor.token}`,
          ...extra,
        ],
        { cwd, bin }
      )
    );
  return {
    deploy: (configPath: string) => run<DeployResult>("deploy", configPath),
    introspect: (configPath: string) => run<{ status: string }>("introspect", configPath),
    diff: (configPath: string) => run<DiffResult>("diff", configPath),
  };
}

interface ChangeSummary {
  totalChanges: number;
  creates: number;
  updates: number;
  deletes: number;
}

export interface DeployResult {
  status: string;
  summary?: ChangeSummary;
}

interface DiffResult {
  summary: ChangeSummary;
}
