import { OraProgressReporter } from "../../cli/progress";

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

  warn(text: string): void {
    this.reporter.warn(text);
  }
}
