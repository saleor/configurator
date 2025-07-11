import chalk from "chalk";
import ora, { type Ora } from "ora";

export interface ProgressReporter {
  start(text: string): void;
  update(text: string): void;
  succeed(text?: string): void;
  fail(text?: string): void;
  info(text: string): void;
  warn(text: string): void;
}

/**
 * Progress reporter using ora spinner
 */
export class OraProgressReporter implements ProgressReporter {
  private spinner: Ora | null = null;

  start(text: string): void {
    this.spinner = ora({
      text,
      spinner: "dots",
    }).start();
  }

  update(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  succeed(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text);
      this.spinner = null;
    }
  }

  fail(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text);
      this.spinner = null;
    }
  }

  info(text: string): void {
    if (this.spinner) {
      this.spinner.info(text);
      this.spinner = null;
    } else {
      console.log(chalk.blue("ℹ"), text);
    }
  }

  warn(text: string): void {
    if (this.spinner) {
      this.spinner.warn(text);
      this.spinner = null;
    } else {
      console.log(chalk.yellow("⚠"), text);
    }
  }
}

/**
 * Progress tracker for bulk operations
 */
export class BulkOperationProgress {
  private current = 0;
  private failures: Array<{ item: string; error: Error }> = [];

  constructor(
    private readonly total: number,
    private readonly operation: string,
    private readonly reporter: ProgressReporter
  ) {}

  start(): void {
    this.reporter.start(`${this.operation} (0/${this.total})`);
  }

  increment(itemName?: string): void {
    this.current++;
    const text = `${this.operation} (${this.current}/${this.total})${
      itemName ? `: ${itemName}` : ""
    }`;
    this.reporter.update(text);
  }

  addFailure(item: string, error: Error): void {
    this.failures.push({ item, error });
  }

  complete(): void {
    if (this.failures.length === 0) {
      this.reporter.succeed(
        `${this.operation} completed (${this.current}/${this.total})`
      );
    } else {
      this.reporter.fail(
        `${this.operation} completed with ${this.failures.length} failures`
      );

      // Report failures
      this.failures.forEach(({ item, error }) => {
        console.log(chalk.red(`  ❌ ${item}: ${error.message}`));
      });
    }
  }

  getFailures(): Array<{ item: string; error: Error }> {
    return this.failures;
  }

  hasFailures(): boolean {
    return this.failures.length > 0;
  }
}

/**
 * Progress indicator for deployment pipeline
 */
export class ProgressIndicator {
  private reporter = new OraProgressReporter();

  startSpinner(text: string): () => void {
    this.reporter.start(text);
    return () => this.reporter.succeed();
  }

  complete(text: string): void {
    this.reporter.succeed(text);
  }

  fail(text: string): void {
    this.reporter.fail(text);
  }
}
