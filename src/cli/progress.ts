import { cliConsole } from "./console";

interface ProgressOptions {
  readonly current: number;
  readonly total: number;
  readonly message: string;
  readonly width?: number;
}

export class ProgressIndicator {
  private static readonly SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private spinnerTimer?: NodeJS.Timer;
  private frameIndex = 0;
  private lastMessage = "";

  startSpinner(message: string): () => void {
    this.stopSpinner();
    this.lastMessage = message;
    this.frameIndex = 0;

    this.spinnerTimer = setInterval(() => {
      this.renderSpinner();
    }, 80);

    // Return cleanup function
    return () => this.stopSpinner();
  }

  updateMessage(message: string): void {
    this.lastMessage = message;
    this.renderSpinner();
  }

  showProgress({ current, total, message, width = 30 }: ProgressOptions): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((current / total) * width);
    const empty = width - filled;

    const bar = `[${"█".repeat(filled)}${" ".repeat(empty)}]`;
    const output = `  ${bar} ${percentage}% - ${message}`;

    this.clearLine();
    process.stdout.write(output);
  }

  complete(message: string): void {
    this.stopSpinner();
    this.clearLine();
    cliConsole.success(`  ✓ ${message}`);
  }

  fail(message: string): void {
    this.stopSpinner();
    this.clearLine();
    cliConsole.error(`  ✗ ${message}`);
  }

  private renderSpinner(): void {
    if (!this.spinnerTimer) return;

    const frame = ProgressIndicator.SPINNER_FRAMES[this.frameIndex];
    this.frameIndex = (this.frameIndex + 1) % ProgressIndicator.SPINNER_FRAMES.length;

    this.clearLine();
    process.stdout.write(`  ${frame} ${this.lastMessage}`);
  }

  private stopSpinner(): void {
    if (this.spinnerTimer) {
      clearInterval(this.spinnerTimer as any);
      this.spinnerTimer = undefined;
      this.clearLine();
    }
  }

  private clearLine(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    } else {
      process.stdout.write("\n");
    }
  }
}