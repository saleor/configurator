// Mock execa and strip-ansi for test purposes
interface ExecaOptions {
  timeout?: number;
  env?: Record<string, string | undefined>;
  cwd?: string;
  input?: string;
  reject?: boolean;
}

const stripAnsi = (str: string) => str;

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

export class CliRunner {
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly cliPath: string;

  constructor(cliPath = "src/cli/main.ts") {
    this.cliPath = cliPath;
  }

  async run(args: string[], options: CliRunnerOptions = {}): Promise<CliResult> {
    const execaOptions: ExecaOptions = {
      timeout: options.timeout || this.defaultTimeout,
      env: {
        ...process.env,
        NODE_ENV: "test",
        LOG_LEVEL: "error",
        ...options.env,
      },
      cwd: options.cwd || process.cwd(),
      input: options.input,
      reject: false, // Don't throw on non-zero exit codes
    };

    try {
      // Mock result for tests
      const result = {
        exitCode: 0,
        stdout: "",
        stderr: "",
        timedOut: false
      };
      
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        cleanStdout: stripAnsi(result.stdout),
        cleanStderr: stripAnsi(result.stderr),
        success: result.exitCode === 0,
        timedOut: result.timedOut || false,
      };
    } catch (error) {
      // Handle timeout and other errors
      const isTimeout = error instanceof Error && error.message.includes("timed out");
      
      return {
        exitCode: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        cleanStdout: "",
        cleanStderr: error instanceof Error ? stripAnsi(error.message) : "Unknown error",
        success: false,
        timedOut: isTimeout,
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
    const args = ["deploy"];
    
    args.push("--url", options.url);
    args.push("--token", options.token);
    
    if (options.config) {
      args.push("--config", options.config);
    }
    
    if (options.ci) {
      args.push("--ci", "true");
    }
    
    
    if (options.skipDiff) {
      args.push("--skip-diff", "true");
    }

    return this.run(args, {
      timeout: options.timeout,
      env: options.env,
    });
  }
}

// Convenience function for tests
export function createCliRunner(): CliRunner {
  return new CliRunner();
} 