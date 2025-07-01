export class ConsoleOutput {
  private options: { quiet: boolean } = { quiet: false };

  setOptions(options: { quiet: boolean } = { quiet: false }) {
    this.options = options;
  }

  status(message: string) {
    console.log(message);
  }

  info(message: string) {
    if (!this.options.quiet) {
      console.log(message);
    }
  }

  error(error: unknown) {
    // TODO: improve error formatting
    console.error(error);
  }
}

// Export a singleton instance
export const cliConsole = new ConsoleOutput();
