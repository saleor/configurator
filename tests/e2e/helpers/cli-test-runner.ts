import { EventEmitter } from "node:events";
import { performance } from "node:perf_hooks";
import { type ExecaError, type Options as ExecaOptions, execa } from "execa";
import stripAnsi from "strip-ansi";

export interface CliTestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  cleanStdout: string;
  cleanStderr: string;
  success: boolean;
  timedOut: boolean;
  isCanceled: boolean;
  isTerminated: boolean;
  isMaxBuffer: boolean;
  duration: number;
  signal?: NodeJS.Signals;
  error?: ExecaError;
  failed: boolean;
}

export interface StreamingResult {
  stdout: AsyncIterableIterator<string>;
  stderr: AsyncIterableIterator<string>;
  process: ReturnType<typeof execa>;
}

export interface CliTestRunnerOptions {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  input?: string;
  maxBuffer?: number;
  reject?: boolean;
  killSignal?: NodeJS.Signals;
  verbose?: boolean;
  collectMetrics?: boolean;
}

export interface CliTestRunnerConfig {
  executable?: string;
  script?: string;
  defaultEnv?: Record<string, string>;
  defaultCwd?: string;
  defaultTimeout?: number;
  defaultMaxBuffer?: number;
  verbose?: boolean;
  timeout?: number;
}

export interface CommandMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  exitCode: number;
  timedOut: boolean;
  command?: string;
}

/**
 * Enhanced CLI test runner with comprehensive execa integration
 * Provides advanced features for testing CLI applications
 */
export class CliTestRunner extends EventEmitter {
  private readonly executable: string;
  private readonly script?: string;
  private readonly defaultEnv: Record<string, string>;
  private readonly defaultCwd: string;
  private readonly defaultTimeout: number;
  private readonly defaultMaxBuffer: number;
  private readonly verbose: boolean;
  private readonly activeProcesses: Set<ReturnType<typeof execa>> = new Set();
  private metrics: Map<string, CommandMetrics> = new Map();

  constructor(config: CliTestRunnerConfig = {}) {
    super();
    this.executable = config.executable ?? "pnpm";
    this.script = this.executable === "pnpm" ? (config.script ?? "dev") : config.script;
    this.defaultEnv = {
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      FORCE_COLOR: "0",
      CI: "true",
      ...config.defaultEnv,
    };
    this.defaultCwd = config.defaultCwd ?? process.cwd();
    this.defaultTimeout = config.defaultTimeout ?? 300_000;
    this.defaultMaxBuffer = config.defaultMaxBuffer ?? 1024 * 1024 * 20; // 20MB
    this.verbose = config.verbose ?? false;
  }

  private buildArgs(args: string[]): string[] {
    if (this.executable === "pnpm" && this.script) {
      return [this.script, ...args];
    }
    return args;
  }

  /**
   * Run a command with comprehensive error handling
   */
  async run(args: string[], options: CliTestRunnerOptions = {}): Promise<CliTestResult> {
    const commandArgs = this.buildArgs(args);
    const startTime = performance.now();
    const reject = options.reject ?? false;

    // Log the command being executed
    const cmdString = `${this.executable} ${commandArgs.join(' ')}`;
    console.log(`  $ ${cmdString.substring(0, 120)}${cmdString.length > 120 ? '...' : ''}`);

    const execaOptions: ExecaOptions = {
      timeout: options.timeout ?? this.defaultTimeout,
      env: {
        ...this.defaultEnv,
        ...options.env,
      },
      cwd: options.cwd ?? this.defaultCwd,
      input: options.input,
      reject,
      stripFinalNewline: false,
      maxBuffer: options.maxBuffer ?? this.defaultMaxBuffer,
      killSignal: options.killSignal,
      buffer: true,
    };

    try {
      const subprocess = execa(this.executable, commandArgs, execaOptions);
      this.activeProcesses.add(subprocess);

      const result = await subprocess;
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.activeProcesses.delete(subprocess);

      if (options.collectMetrics) {
        this.collectMetrics(args.join(" "), {
          startTime,
          endTime,
          duration,
          exitCode: result.exitCode,
          timedOut: false,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        });
      }

      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        cleanStdout: stripAnsi(result.stdout),
        cleanStderr: stripAnsi(result.stderr),
        success: result.exitCode === 0,
        failed: result.failed ?? false,
        timedOut: false,
        isCanceled: false,
        isTerminated: false,
        isMaxBuffer: false,
        duration,
        signal: result.signal,
      };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      const execaError = error as ExecaError;

      this.activeProcesses.delete(execaError.subprocess as ReturnType<typeof execa>);

      if (options.collectMetrics) {
        this.collectMetrics(args.join(" "), {
          startTime,
          endTime,
          duration,
          exitCode: execaError.exitCode ?? -1,
          timedOut: execaError.timedOut ?? false,
        });
      }

      // When reject is false, we should not reach here
      // But if we do, return the error details
      return {
        exitCode: execaError.exitCode ?? -1,
        stdout: execaError.stdout ?? "",
        stderr: execaError.stderr ?? "",
        cleanStdout: stripAnsi(execaError.stdout ?? ""),
        cleanStderr: stripAnsi(execaError.stderr ?? ""),
        success: false,
        failed: true,
        timedOut: execaError.timedOut ?? false,
        isCanceled: execaError.isCanceled ?? false,
        isTerminated: execaError.isTerminated ?? false,
        isMaxBuffer: (execaError as ExecaError & { isMaxBuffer?: boolean }).isMaxBuffer ?? false,
        duration,
        signal: execaError.signal,
        error: execaError,
      };
    }
  }

  /**
   * Run command without throwing on error (using reject: false)
   */
  async runSafe(args: string[], options: CliTestRunnerOptions = {}): Promise<CliTestResult> {
    return this.run(args, { ...options, reject: false });
  }

  /**
   * Stream command output in real-time
   */
  async *stream(
    args: string[],
    options: CliTestRunnerOptions = {}
  ): AsyncIterableIterator<{
    type: "stdout" | "stderr";
    line: string;
  }> {
    const commandArgs = this.buildArgs(args);

    const subprocess = execa(this.executable, commandArgs, {
      timeout: options.timeout ?? this.defaultTimeout,
      env: {
        ...this.defaultEnv,
        ...options.env,
      },
      cwd: options.cwd ?? this.defaultCwd,
      input: options.input,
      maxBuffer: options.maxBuffer ?? this.defaultMaxBuffer,
      killSignal: options.killSignal,
      buffer: false,
    });

    this.activeProcesses.add(subprocess);

    // Stream stdout
    const stdoutIterator = subprocess.iterable({ from: "stdout" });
    const stderrIterator = subprocess.iterable({ from: "stderr" });

    // Merge streams
    const streamPromises: Promise<IteratorResult<string>>[] = [];
    let stdoutDone = false;
    let stderrDone = false;

    while (!stdoutDone || !stderrDone) {
      if (!stdoutDone) {
        streamPromises.push(
          stdoutIterator.next().then((result) => {
            if (result.done) {
              stdoutDone = true;
              return result;
            }
            return { ...result, type: "stdout" as const };
          })
        );
      }

      if (!stderrDone) {
        streamPromises.push(
          stderrIterator.next().then((result) => {
            if (result.done) {
              stderrDone = true;
              return result;
            }
            return { ...result, type: "stderr" as const };
          })
        );
      }

      const result = await Promise.race(streamPromises);
      if (!result.done && "type" in result) {
        yield {
          type: result.type,
          line: stripAnsi(result.value),
        };
      }
    }

    this.activeProcesses.delete(subprocess);
  }

  /**
   * Run command with interactive input simulation
   */
  async runInteractive(
    args: string[],
    interactions: Array<{ waitFor: string | RegExp; respond: string }>,
    options: CliTestRunnerOptions = {}
  ): Promise<CliTestResult> {
    const commandArgs = this.buildArgs(args);
    const startTime = performance.now();

    const subprocess = execa(this.executable, commandArgs, {
      timeout: options.timeout ?? this.defaultTimeout,
      env: {
        ...this.defaultEnv,
        ...options.env,
      },
      cwd: options.cwd ?? this.defaultCwd,
      maxBuffer: options.maxBuffer ?? this.defaultMaxBuffer,
      reject: false,
    });

    this.activeProcesses.add(subprocess);

    let stdout = "";
    let _stderr = "";
    let interactionIndex = 0;

    // Handle stdout for interactions
    subprocess.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();

      if (interactionIndex < interactions.length) {
        const interaction = interactions[interactionIndex];
        const matcher = interaction.waitFor;
        const matches =
          typeof matcher === "string" ? stdout.includes(matcher) : matcher.test(stdout);

        if (matches && subprocess.stdin) {
          subprocess.stdin.write(`${interaction.respond}\n`);
          interactionIndex++;
        }
      }
    });

    subprocess.stderr?.on("data", (chunk) => {
      _stderr += chunk.toString();
    });

    const result = await subprocess;
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeProcesses.delete(subprocess);

    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      cleanStdout: stripAnsi(result.stdout),
      cleanStderr: stripAnsi(result.stderr),
      success: result.exitCode === 0,
      failed: result.failed ?? false,
      timedOut: result.timedOut ?? false,
      isCanceled: result.isCanceled ?? false,
      isTerminated: result.isTerminated ?? false,
      isMaxBuffer: false,
      duration,
      signal: result.signal,
    };
  }

  /**
   * Run multiple commands concurrently
   */
  async runConcurrent(
    commands: Array<{ args: string[]; options?: CliTestRunnerOptions }>,
    options?: { maxConcurrency?: number }
  ): Promise<CliTestResult[]> {
    const maxConcurrency = options?.maxConcurrency ?? commands.length;
    const results: CliTestResult[] = [];
    const queue = [...commands];
    const running: Promise<void>[] = [];

    while (queue.length > 0 || running.length > 0) {
      while (running.length < maxConcurrency && queue.length > 0) {
        const command = queue.shift();
        if (!command) break;
        const promise = this.run(command.args, command.options).then((result) => {
          results.push(result);
        });
        running.push(promise);
      }

      if (running.length > 0) {
        await Promise.race(running);
        running.splice(
          running.findIndex((p) => p === undefined),
          1
        );
      }
    }

    return results;
  }

  /**
   * Test signal handling
   */
  async runWithSignal(
    args: string[],
    signal: NodeJS.Signals,
    delay: number = 1000,
    options: CliTestRunnerOptions = {}
  ): Promise<CliTestResult> {
    const commandArgs = this.buildArgs(args);
    const startTime = performance.now();

    const subprocess = execa(this.executable, commandArgs, {
      timeout: options.timeout ?? this.defaultTimeout,
      env: {
        ...this.defaultEnv,
        ...options.env,
      },
      cwd: options.cwd ?? this.defaultCwd,
      reject: false,
      maxBuffer: options.maxBuffer ?? this.defaultMaxBuffer,
    });

    this.activeProcesses.add(subprocess);

    // Send signal after delay
    setTimeout(() => {
      subprocess.kill(signal);
    }, delay);

    const result = await subprocess;
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.activeProcesses.delete(subprocess);

    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      cleanStdout: stripAnsi(result.stdout),
      cleanStderr: stripAnsi(result.stderr),
      success: false,
      failed: result.failed ?? false,
      timedOut: result.timedOut ?? false,
      isCanceled: result.isCanceled ?? false,
      isTerminated: result.isTerminated ?? false,
      isMaxBuffer: false,
      duration,
      signal: result.signal,
    };
  }

  /**
   * Clean up all active processes
   */
  async cleanup(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
    const promises = Array.from(this.activeProcesses).map((proc) => {
      proc.kill(signal);
      return proc.catch(() => {}); // Ignore errors from killing
    });
    await Promise.all(promises);
    this.activeProcesses.clear();
  }

  /**
   * Collect command execution metrics
   */
  private collectMetrics(command: string, metrics: CommandMetrics): void {
    const key = `${command}-${Date.now()}`;
    this.metrics.set(key, metrics);
    this.emit("metrics", { command, ...metrics });
  }

  /**
   * Get collected metrics
   */
  getMetrics(): Map<string, CommandMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Create a builder for complex test scenarios
   */
  scenario() {
    return new CliTestScenarioBuilder(this);
  }
}

/**
 * Fluent builder for complex test scenarios
 */
export class CliTestScenarioBuilder {
  private steps: Array<() => Promise<unknown>> = [];
  private context: Map<string, unknown> = new Map();

  constructor(private runner: CliTestRunner) {}

  step(name: string, action: (ctx: Map<string, unknown>) => Promise<unknown>): this {
    this.steps.push(async () => {
      const result = await action(this.context);
      this.context.set(name, result);
      return result;
    });
    return this;
  }

  parallel(...actions: Array<(ctx: Map<string, unknown>) => Promise<unknown>>): this {
    this.steps.push(async () => {
      const results = await Promise.all(actions.map((action) => action(this.context)));
      return results;
    });
    return this;
  }

  delay(ms: number): this {
    this.steps.push(() => new Promise((resolve) => setTimeout(resolve, ms)));
    return this;
  }

  async execute(): Promise<Map<string, unknown>> {
    for (const step of this.steps) {
      await step();
    }
    return this.context;
  }
}

/**
 * Create a test runner instance
 */
export function createCliTestRunner(config?: CliTestRunnerConfig): CliTestRunner {
  return new CliTestRunner(config);
}
