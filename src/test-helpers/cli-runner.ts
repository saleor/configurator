import { execa, type ExecaError } from "execa";
import stripAnsi from "strip-ansi";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  cleanStdout: string;
  cleanStderr: string;
  success: boolean;
  timedOut: boolean;
}

export interface CliRunnerOptions {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  input?: string;
}

export interface CliRunnerConfig {
  /**
   * Executable used to start the CLI. Defaults to pnpm so we exercise the same entry point as developers.
   */
  executable?: string;
  /**
   * Script passed to the package manager when using pnpm. Defaults to the local dev entry point.
   */
  script?: string;
  /**
   * Default environment variables applied to every invocation.
   */
  env?: Record<string, string>;
  /**
   * Working directory from which commands are executed. Defaults to the current process cwd.
   */
  cwd?: string;
  /**
   * Default timeout in milliseconds for CLI invocations.
   */
  timeout?: number;
}

export class CliRunner {
  private readonly executable: string;
  private readonly script?: string;
  private readonly defaultEnv: Record<string, string>;
  private readonly defaultCwd: string;
  private readonly defaultTimeout: number;

  constructor(config: CliRunnerConfig = {}) {
    this.executable = config.executable ?? "pnpm";
    this.script = this.executable === "pnpm" ? config.script ?? "dev" : config.script;
    this.defaultEnv = {
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      FORCE_COLOR: "0",
      ...config.env,
    } satisfies Record<string, string>;
    this.defaultCwd = config.cwd ?? process.cwd();
    this.defaultTimeout = config.timeout ?? 300_000; // 5 minutes to accommodate network-heavy flows
  }

  private buildArgs(args: string[]): string[] {
    if (this.executable === "pnpm" && this.script) {
      return [this.script, ...args];
    }

    return args;
  }

  async run(args: string[], options: CliRunnerOptions = {}): Promise<CliResult> {
    const commandArgs = this.buildArgs(args);
    const timeout = options.timeout ?? this.defaultTimeout;

    try {
      const result = await execa(this.executable, commandArgs, {
        timeout,
        env: {
          ...this.defaultEnv,
          ...options.env,
        },
        cwd: options.cwd ?? this.defaultCwd,
        input: options.input,
        reject: false,
        stripFinalNewline: false,
        maxBuffer: 1024 * 1024 * 20, // 20MB for verbose diff outputs
      });

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        cleanStdout: stripAnsi(result.stdout),
        cleanStderr: stripAnsi(result.stderr),
        success: result.exitCode === 0,
        timedOut: result.timedOut ?? false,
      };
    } catch (error) {
      const execaError = error as ExecaError & { stdout?: string; stderr?: string };
      const stdout = execaError.stdout ?? "";
      const stderr = execaError.stderr ?? (execaError.shortMessage ?? execaError.message ?? "");

      return {
        exitCode: typeof execaError.exitCode === "number" ? execaError.exitCode : 1,
        stdout,
        stderr,
        cleanStdout: stripAnsi(stdout),
        cleanStderr: stripAnsi(stderr),
        success: false,
        timedOut: Boolean(execaError.timedOut),
      };
    }
  }

  async deploy(options: {
    url: string;
    token: string;
    config?: string;
    ci?: boolean;
    skipDiff?: boolean;
    timeout?: number;
    env?: Record<string, string>;
  }): Promise<CliResult> {
    const args = ["deploy", "--url", options.url, "--token", options.token];

    if (options.config) {
      args.push("--config", options.config);
    }

    if (options.ci) {
      args.push("--ci");
    }

    if (options.skipDiff) {
      args.push("--skip-diff");
    }

    return this.run(args, {
      timeout: options.timeout,
      env: options.env,
    });
  }
}

export function createCliRunner(config?: CliRunnerConfig): CliRunner {
  return new CliRunner(config);
}
