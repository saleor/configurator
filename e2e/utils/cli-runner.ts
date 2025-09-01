import { execa, type ExecaChildProcess, type Options as ExecaOptions } from "execa";
import path from "node:path";
import { fileURLToPath } from "node:url";
import stripAnsi from "strip-ansi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  cleanStdout: string;
  cleanStderr: string;
  success: boolean;
  duration: number;
  command: string;
}

export interface CliRunnerOptions {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  input?: string;
  verbose?: boolean;
}

export class CliRunner {
  private readonly cliPath: string;
  private readonly defaultTimeout: number;
  private readonly verbose: boolean;

  constructor(options: { cliPath?: string; timeout?: number; verbose?: boolean } = {}) {
    // Resolve the actual CLI binary path
    this.cliPath = options.cliPath || path.resolve(__dirname, "../../bin/cli.mjs");
    this.defaultTimeout = options.timeout || 30000;
    this.verbose = options.verbose || false;
  }

  async run(args: string[], options: CliRunnerOptions = {}): Promise<CliResult> {
    const startTime = Date.now();
    const timeout = options.timeout || this.defaultTimeout;
    const command = `${this.cliPath} ${args.join(" ")}`;

    if (this.verbose || options.verbose) {
      console.log(`🔧 Running: ${command}`);
    }

    const execaOptions: ExecaOptions = {
      timeout,
      env: {
        ...process.env,
        NODE_ENV: "test",
        LOG_LEVEL: options.verbose ? "debug" : "error",
        FORCE_COLOR: "0", // Disable color output for cleaner test assertions
        ...options.env,
      },
      cwd: options.cwd || process.cwd(),
      reject: false, // Don't throw on non-zero exit codes
      all: true, // Combine stdout and stderr
    };

    if (options.input) {
      execaOptions.input = options.input;
    }

    try {
      const result = await execa(this.cliPath, args, execaOptions);

      const cliResult: CliResult = {
        exitCode: result.exitCode || 0,
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        cleanStdout: stripAnsi(result.stdout || ""),
        cleanStderr: stripAnsi(result.stderr || ""),
        success: (result.exitCode || 0) === 0,
        duration: Date.now() - startTime,
        command,
      };

      if (this.verbose || options.verbose) {
        this.logResult(cliResult);
      }

      return cliResult;
    } catch (error: unknown) {
      // Handle timeout and other execution errors
      const execaError = error as any;
      const isTimeout = execaError.timedOut || false;
      
      const cliResult: CliResult = {
        exitCode: execaError.exitCode ?? 1,
        stdout: execaError.stdout ?? "",
        stderr: execaError.stderr ?? execaError.message ?? "Unknown error",
        cleanStdout: stripAnsi(execaError.stdout ?? ""),
        cleanStderr: stripAnsi(execaError.stderr ?? execaError.message ?? "Unknown error"),
        success: false,
        duration: Date.now() - startTime,
        command,
      };

      if (this.verbose || options.verbose) {
        console.error(`❌ Command failed${isTimeout ? " (timeout)" : ""}: ${command}`);
        this.logResult(cliResult);
      }

      if (isTimeout) {
        throw new Error(`Command timed out after ${timeout}ms: ${command}`);
      }

      return cliResult;
    }
  }

  // Convenience methods for common commands

  async introspect(
    url: string,
    token: string,
    options: { config?: string; env?: Record<string, string> } & CliRunnerOptions = {}
  ): Promise<CliResult> {
    const args = ["introspect", "--url", url, "--token", token];
    
    if (options.config) {
      args.push("--config", options.config);
    }

    return this.run(args, options);
  }

  async deploy(
    url: string,
    token: string,
    options: {
      config?: string;
      skipDiff?: boolean;
      ci?: boolean;
      include?: string[];
      exclude?: string[];
    } & CliRunnerOptions = {}
  ): Promise<CliResult> {
    const args = ["deploy", "--url", url, "--token", token];
    
    if (options.config) {
      args.push("--config", options.config);
    }
    
    if (options.ci !== false) {
      args.push("--ci"); // Default to CI mode for tests
    }
    
    if (options.skipDiff) {
      args.push("--skip-diff");
    }

    if (options.include?.length) {
      args.push("--include", options.include.join(","));
    }

    if (options.exclude?.length) {
      args.push("--exclude", options.exclude.join(","));
    }

    return this.run(args, options);
  }

  async diff(
    url: string,
    token: string,
    options: {
      config?: string;
      format?: "table" | "json" | "yaml";
      include?: string[];
      exclude?: string[];
    } & CliRunnerOptions = {}
  ): Promise<CliResult> {
    const args = ["diff", "--url", url, "--token", token];
    
    if (options.config) {
      args.push("--config", options.config);
    }

    if (options.format) {
      args.push("--format", options.format);
    }

    if (options.include?.length) {
      args.push("--include", options.include.join(","));
    }

    if (options.exclude?.length) {
      args.push("--exclude", options.exclude.join(","));
    }

    return this.run(args, options);
  }

  async start(
    options: {
      url?: string;
      token?: string;
      config?: string;
      input?: string; // For interactive prompts
    } & CliRunnerOptions = {}
  ): Promise<CliResult> {
    const args = ["start"];
    
    if (options.url) {
      args.push("--url", options.url);
    }
    
    if (options.token) {
      args.push("--token", options.token);
    }
    
    if (options.config) {
      args.push("--config", options.config);
    }

    return this.run(args, options);
  }

  async version(): Promise<CliResult> {
    return this.run(["--version"]);
  }

  async help(command?: string): Promise<CliResult> {
    if (command) {
      return this.run([command, "--help"]);
    }
    return this.run(["--help"]);
  }

  // Interactive command runner with stdin support
  async runInteractive(
    args: string[],
    inputs: string[],
    options: CliRunnerOptions = {}
  ): Promise<CliResult> {
    const input = inputs.join("\n");
    return this.run(args, { ...options, input });
  }

  // Spawn a long-running process (returns the process handle)
  spawn(args: string[], options: CliRunnerOptions = {}): ExecaChildProcess {
    const execaOptions: ExecaOptions = {
      env: {
        ...process.env,
        NODE_ENV: "test",
        LOG_LEVEL: options.verbose ? "debug" : "error",
        ...options.env,
      },
      cwd: options.cwd || process.cwd(),
      reject: false,
      all: true,
    };

    if (options.timeout) {
      execaOptions.timeout = options.timeout;
    }

    return execa(this.cliPath, args, execaOptions);
  }

  private logResult(result: CliResult): void {
    console.log(`📊 Exit code: ${result.exitCode}`);
    console.log(`⏱️ Duration: ${result.duration}ms`);
    
    if (result.cleanStdout) {
      console.log("📤 Stdout:");
      console.log(result.cleanStdout);
    }
    
    if (result.cleanStderr) {
      console.log("📤 Stderr:");
      console.log(result.cleanStderr);
    }
  }
}

// Factory function for creating CLI runners
export function createCliRunner(options?: ConstructorParameters<typeof CliRunner>[0]): CliRunner {
  return new CliRunner(options);
}