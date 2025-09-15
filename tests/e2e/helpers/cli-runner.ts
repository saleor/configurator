import { execa, type ExecaReturnValue, type Options } from "execa";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import type { TestContext } from "../setup/global-setup.ts";

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
  duration: number;
  success: boolean;
}

export interface CLIOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  input?: string;
  expectFailure?: boolean;
}

export interface IntrospectOptions extends CLIOptions {
  url: string;
  token: string;
  outputDir?: string;
}

export interface DiffOptions extends CLIOptions {
  url: string;
  token: string;
  configDir?: string;
}

export interface DeployOptions extends CLIOptions {
  url: string;
  token: string;
  configDir?: string;
  force?: boolean;
}

/**
 * CLI test runner using execa for executing Saleor Configurator commands
 */
export class CLIRunner {
  private readonly projectRoot: string;
  private readonly cliPath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.cliPath = join(projectRoot, "src/cli/main.ts");

    if (!existsSync(this.cliPath)) {
      throw new Error(`CLI entry point not found at: ${this.cliPath}`);
    }
  }

  /**
   * Execute a CLI command with the given arguments
   */
  async run(
    command: string,
    args: string[] = [],
    options: CLIOptions = {}
  ): Promise<CLIResult> {
    const startTime = Date.now();

    const execaOptions: Options = {
      cwd: options.cwd || this.projectRoot,
      timeout: options.timeout || 60000,
      env: {
        ...process.env,
        NODE_ENV: "test",
        LOG_LEVEL: "error",
        ...options.env,
      },
      input: options.input,
      reject: false, // Don't throw on non-zero exit codes
    };

    const fullCommand = ["tsx", this.cliPath, command, ...args];
    const commandString = fullCommand.join(" ");

    console.log(`🔧 Executing: ${commandString}`);
    console.log(`📁 Working directory: ${execaOptions.cwd}`);

    let result: ExecaReturnValue;
    try {
      result = await execa("tsx", [this.cliPath, command, ...args], execaOptions);
    } catch (error: any) {
      // Handle execution errors (e.g., timeout, command not found)
      result = {
        stdout: error.stdout || "",
        stderr: error.stderr || error.message || "Unknown error",
        exitCode: error.exitCode || 1,
        command: commandString,
        durationMs: Date.now() - startTime,
      } as ExecaReturnValue;
    }

    const duration = Date.now() - startTime;
    const success = result.exitCode === 0;

    // Log results
    if (success) {
      console.log(`✅ Command completed successfully in ${duration}ms`);
    } else {
      console.log(`❌ Command failed with exit code ${result.exitCode} in ${duration}ms`);
      if (result.stderr) {
        console.log(`📝 Error output: ${result.stderr}`);
      }
    }

    const cliResult: CLIResult = {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      command: commandString,
      duration,
      success,
    };

    // Throw if failure was unexpected
    if (!success && !options.expectFailure) {
      const error = new Error(
        `CLI command failed: ${commandString}\n` +
        `Exit code: ${result.exitCode}\n` +
        `Error: ${result.stderr}`
      );
      (error as any).cliResult = cliResult;
      throw error;
    }

    return cliResult;
  }

  /**
   * Execute the introspect command
   */
  async introspect(options: IntrospectOptions): Promise<CLIResult> {
    const args = [
      "--url", options.url,
      "--token", options.token,
    ];

    if (options.outputDir) {
      // Ensure output directory exists
      await mkdir(options.outputDir, { recursive: true });
      process.chdir(options.outputDir);
    }

    return this.run("introspect", args, options);
  }

  /**
   * Execute the diff command
   */
  async diff(options: DiffOptions): Promise<CLIResult> {
    const args = [
      "--url", options.url,
      "--token", options.token,
    ];

    const runOptions = { ...options };
    if (options.configDir) {
      runOptions.cwd = options.configDir;
    }

    return this.run("diff", args, runOptions);
  }

  /**
   * Execute the deploy command
   */
  async deploy(options: DeployOptions): Promise<CLIResult> {
    const args = [
      "--url", options.url,
      "--token", options.token,
    ];

    if (options.force) {
      args.push("--force");
    }

    const runOptions = { ...options };
    if (options.configDir) {
      runOptions.cwd = options.configDir;
    }

    return this.run("deploy", args, runOptions);
  }

  /**
   * Check if configuration files exist in the given directory
   */
  async hasConfigurationFiles(directory: string): Promise<boolean> {
    const configFiles = [
      "saleor-app.yaml",
      "configuration.yaml",
      "products.yaml",
      "categories.yaml",
    ];

    for (const file of configFiles) {
      const filePath = join(directory, file);
      if (existsSync(filePath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Read a configuration file and parse it
   */
  async readConfigFile(filePath: string): Promise<any> {
    try {
      const content = await readFile(filePath, "utf-8");
      // Basic YAML parsing - in a real implementation you might want to use a proper YAML parser
      return content;
    } catch (error) {
      throw new Error(`Failed to read config file ${filePath}: ${error}`);
    }
  }

  /**
   * Write a configuration file
   */
  async writeConfigFile(filePath: string, content: string): Promise<void> {
    try {
      await writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new Error(`Failed to write config file ${filePath}: ${error}`);
    }
  }

  /**
   * Create a test CLI runner with context
   */
  static create(testContext: TestContext): CLIRunner {
    const runner = new CLIRunner();
    return runner;
  }
}

/**
 * Utility function to create a CLI runner instance
 */
export function createCLIRunner(testContext?: TestContext): CLIRunner {
  return testContext ? CLIRunner.create(testContext) : new CLIRunner();
}

/**
 * Parse CLI output for specific patterns
 */
export class CLIOutputParser {
  /**
   * Extract entity counts from introspect output
   */
  static extractEntityCounts(output: string): Record<string, number> {
    const counts: Record<string, number> = {};

    // Example patterns to match:
    // "Found 5 products"
    // "Downloaded 3 categories"
    const patterns = [
      /Found (\d+) (\w+)/g,
      /Downloaded (\d+) (\w+)/g,
      /(\d+) (\w+) introspected/g,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const count = parseInt(match[1], 10);
        const entity = match[2].toLowerCase();
        counts[entity] = count;
      }
    }

    return counts;
  }

  /**
   * Extract diff summary from diff output
   */
  static extractDiffSummary(output: string): {
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
  } {
    const summary = { added: 0, modified: 0, deleted: 0, unchanged: 0 };

    // Example patterns:
    // "Added: 5 entities"
    // "Modified: 3 entities"
    const patterns = {
      added: /Added?:\s*(\d+)/gi,
      modified: /Modified?:\s*(\d+)/gi,
      deleted: /Deleted?:\s*(\d+)/gi,
      unchanged: /Unchanged?:\s*(\d+)/gi,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = pattern.exec(output);
      if (match) {
        summary[key as keyof typeof summary] = parseInt(match[1], 10);
      }
    }

    return summary;
  }

  /**
   * Check if output indicates successful deployment
   */
  static isDeploymentSuccessful(output: string): boolean {
    const successPatterns = [
      /deployment completed successfully/i,
      /successfully deployed/i,
      /deployment successful/i,
      /✅.*deployed/i,
    ];

    return successPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Extract error messages from CLI output
   */
  static extractErrors(output: string): string[] {
    const errors: string[] = [];

    const errorPatterns = [
      /error:\s*(.+)/gi,
      /❌\s*(.+)/gi,
      /failed:\s*(.+)/gi,
    ];

    for (const pattern of errorPatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        errors.push(match[1].trim());
      }
    }

    return errors;
  }
}